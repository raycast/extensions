#!/usr/bin/env bash
# Shared helpers + structured result emitters for Phase 1 spikes.
set -uo pipefail

SPIKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SPIKE_DIR/config.sh"

# --- structured result lines (paste these into manual-test-notes.md) ---
emit() {
  # emit <MECHANISM> <STEP> <PASS|FAIL|UNKNOWN> <message...>
  local mech="$1" step="$2" status="$3"; shift 3
  printf '[RESULT] mechanism=%s step=%s status=%s detail="%s"\n' "$mech" "$step" "$status" "$*"
}

# --- discord process detection (objective; safe to auto-record) ---
discord_is_running() {
  pgrep -x "Discord" >/dev/null 2>&1 || pgrep -f "Discord.app/Contents/MacOS/Discord" >/dev/null 2>&1
}

frontmost_app() {
  osascript -e 'tell application "System Events" to get name of first process whose frontmost is true' 2>/dev/null
}

bundle_id_running() {
  # returns 0 if a process with our bundle id is running
  osascript -e "tell application \"System Events\" to exists (processes where bundle identifier is \"$DISCORD_BUNDLE_ID\")" 2>/dev/null | grep -qi true
}
