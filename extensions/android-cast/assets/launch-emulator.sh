#!/bin/zsh

set -u

emulator_path="$1"
adb_path="$2"
scrcpy_path="$3"
avd_name="$4"
serial="$5"
log_path="$6"
launch_mode="$7"
emulator_pid=""

exec >>"$log_path" 2>&1
export ADB="$adb_path"

echo "Helper started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [[ "$launch_mode" == "start" ]]; then
  port="${serial#emulator-}"
  echo "Starting headless AVD $avd_name on $serial"
  "$emulator_path" -avd "$avd_name" -no-window -port "$port" &
  emulator_pid="$!"
else
  echo "Using already-running AVD $avd_name on $serial"
fi

for attempt in {1..180}; do
  if [[ -n "$emulator_pid" ]] && ! kill -0 "$emulator_pid" 2>/dev/null; then
    wait "$emulator_pid"
    exit_code="$?"
    echo "Android Emulator exited before boot completed with status $exit_code"
    exit "$exit_code"
  fi

  state="$("$adb_path" -s "$serial" get-state 2>/dev/null || true)"
  boot_completed="$("$adb_path" -s "$serial" shell getprop sys.boot_completed 2>/dev/null || true)"
  echo "Boot check $attempt: state=${state:-unavailable}, completed=${boot_completed:-pending}"

  if [[ "$state" == "device" && "$boot_completed" == "1" ]]; then
    echo "Android has booted; opening scrcpy"
    exec "$scrcpy_path" -s "$serial" --window-title "scrcpy - $avd_name"
  fi

  sleep 1
done

echo "Android Emulator did not finish booting within three minutes"
exit 1
