#!/bin/sh

set -u
umask 077

SESSION_DIR="${1:-}"
case "$SESSION_DIR" in
  */com.yuchen.agent-night-watch/session.*) ;;
  *) exit 64 ;;
esac

READY_FILE="$SESSION_DIR/ready"
STOP_FILE="$SESSION_DIR/stop"
STOPPED_FILE="$SESSION_DIR/stopped"
REASON_FILE="$SESSION_DIR/reason"
ORIGINAL_FILE="$SESSION_DIR/original"

sleep_is_disabled() {
  /usr/bin/pmset -g | /usr/bin/grep -Eq '^[[:space:]]*SleepDisabled[[:space:]]+1[[:space:]]*$'
}

original_state=0
if sleep_is_disabled; then
  original_state=1
fi

cleanup() {
  cleanup_status=$?
  trap - EXIT HUP INT TERM
  /usr/bin/pmset -a disablesleep "$original_state" >/dev/null 2>&1 || true
  /bin/rm -f "$READY_FILE"
  /usr/bin/touch "$STOPPED_FILE"
  exit "$cleanup_status"
}

trap cleanup EXIT HUP INT TERM

/bin/echo "$original_state" > "$ORIGINAL_FILE"
/usr/bin/pmset -a disablesleep 1 >/dev/null
sleep_is_disabled || exit 1
/usr/bin/touch "$READY_FILE"

while [ ! -e "$STOP_FILE" ]; do
  if ! sleep_is_disabled; then
    /bin/echo external-change > "$REASON_FILE"
    exit 0
  fi
  /bin/sleep 1
done

if [ ! -s "$REASON_FILE" ]; then
  /bin/echo manual > "$REASON_FILE"
fi
