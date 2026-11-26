import { spawn } from "node:child_process";

// loginwindow reads idleTime with CFPreferencesGetAppIntegerValue and falls back to 1200 s (EngineDefaults.plist).
const LOCK_SCREEN_DELAY = `function lockScreenDelay(domain) {
  const valid = Ref();
  const seconds = $.CFPreferencesGetAppIntegerValue($("idleTime"), $(domain), valid);
  return valid[0] ? Math.max(seconds, 0) : 1200;
}`;

export const IDLE_TIME_SCRIPT = `ObjC.import("Foundation");
${LOCK_SCREEN_DELAY}
function run(argv) {
  return String(lockScreenDelay(argv[0]));
}`;

// Assertions are read structurally because pmset prints caller-chosen names unescaped, so a name can forge a row.
export const ACTIVE_ASSERTIONS = `function activeAssertions(byPid) {
  const assertions = [];
  const pids = byPid.allKeys;
  for (let i = 0; i < pids.count; i++) {
    const pid = Number(ObjC.unwrap(pids.objectAtIndex(i)));
    const list = byPid.objectForKey(pids.objectAtIndex(i));
    for (let j = 0; j < list.count; j++) {
      const assertion = list.objectAtIndex(j);
      if (ObjC.unwrap(assertion.objectForKey("AssertLevel")) === 0) continue;
      if (ObjC.unwrap(assertion.objectForKey("AssertionIsStateSuspended")) === true) continue;
      assertions.push({ pid, type: ObjC.unwrap(assertion.objectForKey("AssertType")) });
    }
  }
  return assertions;
}`;

// "blocked" covers the cases where loginwindow skips its idle screen saver and waits a full delay. Coffee's own
// caffeinate -d is the one display assertion the watcher may override.
const LAUNCH_VERDICT = `function launchVerdict(pid, state) {
  const keepsDisplayOn = (type) => type === "PreventUserIdleDisplaySleep" || type === "NoDisplaySleepAssertion";
  if (!state.onConsole || state.locked || state.displays === 0) return "blocked";
  if (state.assertions.some((a) => a.pid !== pid && (keepsDisplayOn(a.type) || a.type === "DisplayWake"))) {
    return "blocked";
  }
  if (!state.assertions.some((a) => a.pid === pid && keepsDisplayOn(a.type))) return "unowned";
  return state.delay > 0 && state.idle >= state.delay ? "launch" : "active";
}`;

export const DECISION_SCRIPT = `ObjC.import("CoreGraphics");
ObjC.import("IOKit");
${LOCK_SCREEN_DELAY}
${ACTIVE_ASSERTIONS}
${LAUNCH_VERDICT}
function run(argv) {
  const session = ObjC.castRefToObject($.CGSessionCopyCurrentDictionary());
  const flag = (key) => !session.isNil() && Boolean(ObjC.unwrap(session.objectForKey(key)));
  const displays = Ref();
  if ($.CGGetActiveDisplayList(0, null, displays) !== 0) throw new Error("Cannot list displays");
  const byPid = Ref();
  if ($.IOPMCopyAssertionsByProcess(byPid) !== 0) throw new Error("Cannot read power assertions");
  const state = {
    onConsole: flag("kCGSSessionOnConsoleKey"),
    locked: flag("CGSSessionScreenIsLocked"),
    displays: displays[0],
    assertions: activeAssertions(ObjC.castRefToObject(byPid[0])),
    delay: lockScreenDelay(argv[0]),
    // loginwindow's session clock: kCGEventSourceStateCombinedSessionState, kCGAnyInputEventType (not bridged).
    idle: $.CGEventSourceSecondsSinceLastEventType(0, 0xffffffff),
  };
  return launchVerdict(Number(argv[1]), state) + " " + state.delay;
}`;

// macOS skips its idle screen saver while any app prevents display sleep, including Coffee's caffeinate -d.
export const SCREEN_SAVER_WATCHER = `pid=$1 started=$2 uid=$(id -u) armed=1 polls=0 limit= last=0 sampled= slept=0 blocked=
owned() { [ "$(echo $(ps -p "$pid" -o lstart= 2>/dev/null))" = "$started" ]; }
read_limit() {
  value=$(osascript -l JavaScript -e "$COFFEE_IDLE_TIME" com.apple.screensaver 2>/dev/null) || return
  case $value in "" | *[!0-9]*) return 1 ;; esac
  limit=$value
}
sample_idle() {
  idle=$(ioreg -c IOHIDSystem -d 4 | awk '/HIDIdleTime/ { printf "%d", $NF / 1000000; exit }')
  case $idle in "" | *[!0-9]*) return 1 ;; esac
}
# HIDIdleTime counts uptime, which runs at least as long as each sleep, so slower growth means input.
# A poll that overran by a whole delay could hide input, so that counts as input too.
had_input() {
  [ "$idle" -lt $((limit * 1000)) ] || [ $((idle + 1)) -lt $((last + slept * 1000)) ] ||
    { [ -n "$sampled" ] && [ $((now - sampled - slept)) -ge "$limit" ]; }
}
wake_in() {
  [ $((($1 + 999) / 1000)) -lt $delay ] && delay=$((($1 + 999) / 1000))
}
decide() {
  set -- $(osascript -l JavaScript -e "$COFFEE_DECISION" com.apple.screensaver "$pid" 2>/dev/null)
  [ $# = 2 ] || return
  case $2 in *[!0-9]*) return 1 ;; esac
  verdict=$1 limit=$2
}
start_screen_saver() {
  pgrep -q -x -u "$uid" ScreenSaverEngine
  case $? in
    0) armed=0 ;;
    1) owned && open -b com.apple.ScreenSaver.Engine && armed=0 ;;
  esac
}
while owned; do
  delay=15 refresh=0
  [ $((polls % 4)) = 0 ] && refresh=1
  polls=$((polls + 1))
  # Idle time means nothing without a delay, so read it before sampling.
  [ $refresh = 1 ] && [ "\${limit:-0}" = 0 ] && refresh=0 && read_limit
  if [ "\${limit:-0}" -gt 0 ] && sample_idle; then
    now=$(date +%s)
    had_input && armed=1 blocked=
    last=$idle sampled=$now slept=0
    if [ "$idle" -lt $((limit * 1000)) ]; then
      wake_in $((limit * 1000 - idle))
    elif [ $armed = 1 ] && [ -n "$blocked" ] && [ "$idle" -lt $((blocked + limit * 1000)) ]; then
      wake_in $((blocked + limit * 1000 - idle))
    elif [ $armed = 1 ] && decide; then
      refresh=0
      case $verdict in
        # A Touch ID unlock resets only this HID clock, so it must reach the delay too.
        launch) sample_idle && [ "$idle" -ge $((limit * 1000)) ] && start_screen_saver ;;
        # Like loginwindow, check again only after another full delay.
        blocked) blocked=$idle ;;
      esac
    fi
  fi
  [ $refresh = 1 ] && read_limit
  slept=$((slept + delay))
  sleep $delay
done`;

/** Start the screen saver after the Lock Screen delay for as long as this caffeinate process runs. Never throws. */
export function startScreenSaverWatcher({ pid, createdAt }: { pid: number; createdAt: string }) {
  const report = (error: unknown) => console.error("Cannot watch for the screen saver:", error);
  try {
    const watcher = spawn("/bin/sh", ["-c", SCREEN_SAVER_WATCHER, "coffee-screen-saver", String(pid), createdAt], {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
        // createdAt comes from ps in this locale and time zone.
        LC_ALL: "C",
        TZ: "UTC",
        COFFEE_IDLE_TIME: IDLE_TIME_SCRIPT,
        COFFEE_DECISION: DECISION_SCRIPT,
      },
    });
    watcher.once("error", report);
    watcher.unref();
  } catch (error) {
    // Coffee's session is already running and recorded, so a failed watcher only skips the screen saver.
    report(error);
  }
}
