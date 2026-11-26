import { spawn } from "node:child_process";

// loginwindow reads idleTime with CFPreferencesGetAppIntegerValue and falls back to 1200 s (EngineDefaults.plist).
export const IDLE_TIME_SCRIPT = `ObjC.import("Foundation");
function run(argv) {
  const valid = Ref();
  const seconds = $.CFPreferencesGetAppIntegerValue($("idleTime"), $(argv[0]), valid);
  return valid[0] ? String(Math.max(seconds, 0)) : "1200";
}`;

// loginwindow also skips its idle screen saver while switched out, after a screen lock, or with no display awake.
// Assertions are read structurally because pmset prints caller-chosen names unescaped, so a name can forge a row.
export const LAUNCH_STATE_SCRIPT = `ObjC.import("CoreGraphics");
ObjC.import("IOKit");
function run() {
  const session = ObjC.castRefToObject($.CGSessionCopyCurrentDictionary());
  const flag = (key) => (session.isNil() || !ObjC.unwrap(session.objectForKey(key)) ? 0 : 1);
  const displays = Ref();
  const awake = $.CGGetActiveDisplayList(0, null, displays) === 0 ? displays[0] : 0;
  const rows = ["session " + flag("kCGSSessionOnConsoleKey") + " " + flag("CGSSessionScreenIsLocked") + " " + awake];
  const ref = Ref();
  if ($.IOPMCopyAssertionsByProcess(ref) !== 0) throw new Error("Cannot read power assertions");
  const byPid = ObjC.castRefToObject(ref[0]);
  const pids = byPid.allKeys;
  for (let i = 0; i < pids.count; i++) {
    const assertions = byPid.objectForKey(pids.objectAtIndex(i));
    for (let j = 0; j < assertions.count; j++) {
      const assertion = assertions.objectAtIndex(j);
      if (ObjC.unwrap(assertion.objectForKey("AssertLevel")) === 0) continue;
      if (ObjC.unwrap(assertion.objectForKey("AssertionIsStateSuspended")) === true) continue;
      rows.push(ObjC.unwrap(pids.objectAtIndex(i)) + " " + ObjC.unwrap(assertion.objectForKey("AssertType")));
    }
  }
  return rows.join("\\n");
}`;

// macOS skips its idle screen saver while any app prevents display sleep, including Coffee's caffeinate -d.
export const SCREEN_SAVER_WATCHER = `pid=$1 started=$2 uid=$(id -u) armed=1 polls=0 limit= last=0 slept=0
read_limit() {
  value=$(osascript -l JavaScript -e "$COFFEE_IDLE_TIME" com.apple.screensaver 2>/dev/null) || return
  case $value in "" | *[!0-9]*) return 1 ;; esac
  limit=$value
}
sample_idle() {
  idle=$(ioreg -c IOHIDSystem -d 4 | awk '/HIDIdleTime/ { print int($NF / 1000000000); exit }')
  case $idle in "" | *[!0-9]*) return 1 ;; esac
}
can_launch() {
  state=$(osascript -l JavaScript -e "$COFFEE_LAUNCH_STATE" 2>/dev/null) || return
  printf '%s\\n' "$state" | grep -Eqx "session 1 0 [1-9][0-9]*" &&
    printf '%s\\n' "$state" | grep -Eqx "$pid (PreventUserIdleDisplaySleep|NoDisplaySleepAssertion)" &&
    ! printf '%s\\n' "$state" | grep -Ex "[0-9]+ (PreventUserIdleDisplaySleep|NoDisplaySleepAssertion|DisplayWake)" | grep -qv "^$pid "
}
while [ "$(echo $(ps -p "$pid" -o lstart= 2>/dev/null))" = "$started" ]; do
  delay=15
  [ $((polls % 4)) = 0 ] && read_limit
  polls=$((polls + 1))
  if [ -n "$limit" ] && [ "$limit" -gt 0 ] && sample_idle; then
    if [ "$idle" -lt "$limit" ] || [ "$idle" -lt $((last + slept)) ]; then armed=1; fi
    last=$idle slept=0
    if [ "$idle" -lt "$limit" ]; then
      [ $((limit - idle)) -lt $delay ] && delay=$((limit - idle))
    elif [ $armed = 1 ] && read_limit && [ "$limit" -gt 0 ] && can_launch && sample_idle && [ "$idle" -ge "$limit" ]; then
      pgrep -q -x -u "$uid" ScreenSaverEngine || open -b com.apple.ScreenSaver.Engine && armed=0
    fi
  fi
  slept=$((slept + delay))
  sleep $delay
done`;

/** Start the screen saver after the Lock Screen delay for as long as this caffeinate process runs. */
export function startScreenSaverWatcher({ pid, createdAt }: { pid: number; createdAt: string }) {
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
      COFFEE_LAUNCH_STATE: LAUNCH_STATE_SCRIPT,
    },
  });
  watcher.once("error", (error) => console.error("Cannot watch for the screen saver:", error));
  watcher.unref();
}
