import path from "node:path";

export const PRIVILEGED_GUARD_PROGRAM = String.raw`set -u
STOP_FILE="$1"

sleep_is_disabled() {
  /usr/bin/pmset -g | /usr/bin/grep -Eq '^[[:space:]]*SleepDisabled[[:space:]]+1[[:space:]]*$'
}

original_state=0
if sleep_is_disabled; then
  original_state=1
fi

restore_original_state() {
  cleanup_status=$?
  trap - EXIT HUP INT TERM
  /usr/bin/pmset -a disablesleep "$original_state" >/dev/null 2>&1 || true
  exit "$cleanup_status"
}

trap restore_original_state EXIT HUP INT TERM

/usr/bin/pmset -a disablesleep 1 >/dev/null
sleep_is_disabled || exit 1

while [ ! -e "$STOP_FILE" ]; do
  if ! sleep_is_disabled; then
    exit 0
  fi
  /bin/sleep 1
done`;

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export function appleScriptQuote(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function buildPrivilegedGuardCommand(sessionDir: string): string {
  const stopFile = path.join(sessionDir, "stop");
  return `/bin/sh -c ${shellQuote(PRIVILEGED_GUARD_PROGRAM)} agent-night-watch ${shellQuote(stopFile)}`;
}

export function buildAdministratorAppleScript(rootCommand: string): string {
  return `with timeout of 2147483647 seconds\n  do shell script "${appleScriptQuote(rootCommand)}" with administrator privileges\nend timeout`;
}
