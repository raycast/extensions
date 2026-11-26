import { spawn } from "node:child_process";

// macOS skips its idle screen saver while any app prevents display sleep, including Coffee's caffeinate -d.
export const SCREEN_SAVER_WATCHER = `pid=$1 started=$2 armed=1
while [ "$(echo $(ps -p "$pid" -o lstart= 2>/dev/null))" = "$started" ]; do
  delay=15
  limit=$(defaults -currentHost read com.apple.screensaver idleTime 2>/dev/null) || limit=1200
  idle=$(ioreg -c IOHIDSystem -d 4 | awk '/HIDIdleTime/ { print int($NF / 1000000000); exit }')
  case $limit:$idle in
    0:* | :* | *: | *[!0-9:]*) ;;
    *)
      if [ "$idle" -lt "$limit" ]; then
        armed=1
        [ $((limit - idle)) -lt $delay ] && delay=$((limit - idle))
      elif [ $armed = 1 ] && ! pmset -g assertions | grep "PreventUserIdleDisplaySleep named" | grep -qv "pid $pid("; then
        pgrep -qx ScreenSaverEngine || open -b com.apple.ScreenSaver.Engine && armed=0
      fi
      ;;
  esac
  sleep $delay
done`;

/** Start the screen saver after the Lock Screen delay for as long as this caffeinate process runs. */
export function startScreenSaverWatcher({ pid, createdAt }: { pid: number; createdAt: string }) {
  const watcher = spawn("/bin/sh", ["-c", SCREEN_SAVER_WATCHER, "coffee-screen-saver", String(pid), createdAt], {
    detached: true,
    stdio: "ignore",
    // createdAt comes from ps in this locale and time zone.
    env: { ...process.env, PATH: "/usr/bin:/bin:/usr/sbin:/sbin", LC_ALL: "C", TZ: "UTC" },
  });
  watcher.once("error", (error) => console.error("Cannot watch for the screen saver:", error));
  watcher.unref();
}
