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
export const SCREEN_SAVER_WATCHER = `pid=$1 started=$2 uid=$(id -u) armed=1 unknown=0 fresh=60 limit= last=0 last_after= slept=0 overran=0 blocked= blocked_for= decided=
# ps exits 0 without output when it can't read the process table, and 1 both once the PID is gone and when it fails.
owner() {
  lstart=$(ps -p "$pid" -o lstart= 2>/dev/null) || { kill -0 "$pid" 2>/dev/null && return 1; return 2; }
  [ -n "$lstart" ] || return 1
  [ "$(echo $lstart)" = "$started" ] || return 2
}
# kern.monotonicclock_usecs also reports mach_absolute_time, the clock HIDIdleTime counts in, on Macs that have it.
ticks_per_ms=$(sysctl -n hw.tbfrequency 2>/dev/null)
case $ticks_per_ms in "" | *[!0-9]*) ticks_per_ms=0 ;; esac
ticks_per_ms=$((ticks_per_ms / 1000))
uptime_ms() {
  [ $ticks_per_ms -gt 0 ] || return
  set -- $(sysctl -n kern.monotonicclock_usecs 2>/dev/null)
  [ $# = 2 ] || return
  case $2 in *[!0-9]*) return 1 ;; esac
  clock=$(($2 / ticks_per_ms))
}
uptime_ms || ticks_per_ms=0
read_limit() {
  fresh=0
  value=$(osascript -l JavaScript -e "$COFFEE_IDLE_TIME" com.apple.screensaver 2>/dev/null) || return
  case $value in "" | *[!0-9]*) return 1 ;; esac
  limit=$value
}
# Reading the uptime on both sides bounds when HIDIdleTime was read.
sample_idle() {
  uptime_ms && before=$clock || before=
  value=$(ioreg -c IOHIDSystem -d 4 | awk '/HIDIdleTime/ { printf "%d", $NF / 1000000; exit }')
  uptime_ms && after=$clock || after=
  case $value in "" | *[!0-9]*) return 1 ;; esac
  idle=$value
}
# HIDIdleTime only falls on input, and otherwise grows at least as much as the uptime between two samples.
# Without that clock it grows at least as much as each requested sleep, and a sleep that overran by a whole delay could hide input.
had_input() {
  if [ -n "$before" ] && [ -n "$last_after" ]; then
    [ $((idle + 1)) -lt $((last + before - last_after)) ]
  else
    [ $((idle + 1)) -lt $((last + slept * 1000)) ] || [ "$overran" -ge $((limit * 1000)) ]
  fi
}
wake_in() {
  [ $((($1 + 999) / 1000)) -lt $delay ] && delay=$((($1 + 999) / 1000))
}
decide() {
  set -- $(osascript -l JavaScript -e "$COFFEE_DECISION" com.apple.screensaver "$pid" 2>/dev/null)
  uptime_ms && decided=$clock || decided=
  [ $# = 2 ] || return
  case $2 in *[!0-9]*) return 1 ;; esac
  verdict=$1 limit=$2 fresh=0
}
# The verdict goes stale during slow checks, so decide again after one.
recent() {
  [ -z "$decided" ] || [ -z "$before" ] || [ $((before - decided)) -lt 1000 ]
}
start_screen_saver() {
  pgrep -q -x -u "$uid" ScreenSaverEngine
  case $? in
    0) armed=0 ;;
    # A Touch ID unlock resets only this HID clock, so it must reach the delay too. Sampling last catches input during the checks.
    1) owner && sample_idle && [ "$idle" -ge $((limit * 1000)) ] && recent && open -b com.apple.ScreenSaver.Engine && armed=0 ;;
  esac
}
# Without the uptime clock, /usr/bin/time times the sleep on CLOCK_MONOTONIC, which setting the clock doesn't move.
# That only matters while input would change something.
pause() {
  measured=$((delay * 1000))
  if [ $ticks_per_ms -gt 0 ] || { [ $armed = 1 ] && [ -z "$blocked" ]; }; then
    sleep "$delay"
  else
    timed=$(command time -p sleep "$delay" 2>&1 >/dev/null |
      awk '$1 == "real" && $2 ~ /^[0-9]+[.][0-9]+$/ { printf "%d", $2 * 1000 + 0.5; exit }')
    case $timed in "" | *[!0-9]*) ;; *) measured=$timed ;; esac
  fi
  slept=$((slept + delay)) overran=$((overran + measured - delay * 1000)) fresh=$((fresh + delay))
}
while :; do
  owner
  case $? in 0) unknown=0 ;; 1) unknown=$((unknown + 1)) ;; *) break ;; esac
  [ $unknown -ge 20 ] && break
  delay=15
  if [ $unknown = 0 ]; then
    # Idle time means nothing without a delay, so read it before sampling.
    [ $fresh -ge 60 ] && [ "\${limit:-0}" = 0 ] && read_limit
    if [ "\${limit:-0}" -gt 0 ] && sample_idle; then
      had_input && armed=1 blocked=
      # A block whose own sample failed waits from this one.
      [ "$blocked" = next ] && blocked=$idle
      last=$idle last_after=$after slept=0 overran=0
      # Wait out the delay in force when the blocker was seen, unless the delay has since shortened.
      held=0
      [ -n "$blocked" ] && held=$((blocked + (blocked_for < limit ? blocked_for : limit) * 1000))
      if [ "$idle" -lt $((limit * 1000)) ]; then
        wake_in $((limit * 1000 - idle))
      elif [ $armed = 1 ] && [ "$idle" -lt $held ]; then
        wake_in $((held - idle))
      elif [ $armed = 1 ] && decide; then
        case $verdict in
          launch) start_screen_saver ;;
          # The wait starts after the decision, which can be slow.
          blocked)
            blocked_for=$limit blocked=next
            sample_idle && blocked=$idle last=$idle last_after=$after
            ;;
        esac
      fi
    fi
    if [ $fresh -ge 60 ] && [ "\${limit:-0}" != 0 ]; then
      previous=$limit
      read_limit
      # Act on a changed delay now rather than after another sleep.
      [ "$limit" = "$previous" ] || continue
    fi
  fi
  pause
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
