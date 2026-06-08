#!/usr/bin/env bash
# Phase 1 spike: SHORTCUT DISPATCH
# Proves whether Discord mute/deafen can be toggled by sending the in-app keybind,
# and measures the focus-disruption cost (activate Discord -> key -> restore focus).
#
# Usage:
#   ./01-shortcut-dispatch.sh mute     # toggle mute once
#   ./01-shortcut-dispatch.sh deafen   # toggle deafen once
#   ./01-shortcut-dispatch.sh no-discord-check
#
# You must visually watch Discord and record whether the state actually flipped.
# Requires: System Settings > Privacy & Security > Accessibility -> allow Terminal (or your shell app).

set -uo pipefail
SPIKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SPIKE_DIR/lib.sh"

MECH="shortcut"

usage() { echo "usage: $0 {mute|deafen|no-discord-check}"; exit 2; }
[ $# -eq 1 ] || usage

action="$1"
case "$action" in
  mute)   KEY="$MUTE_KEY";   label="toggle-mute"   ;;
  deafen) KEY="$DEAFEN_KEY"; label="toggle-deafen" ;;
  no-discord-check)
    if discord_is_running; then
      emit "$MECH" "no-discord-precondition" "UNKNOWN" "Discord IS running; quit it fully and re-run to test the no-Discord path"
    else
      emit "$MECH" "no-discord-precondition" "PASS" "Discord not running -> extension must return UNAVAILABLE before dispatch (detection works)"
    fi
    exit 0
    ;;
  *) usage ;;
esac

# 1. Precondition: Discord must be running.
if ! discord_is_running; then
  emit "$MECH" "$label-precondition" "FAIL" "Discord not running; cannot dispatch. (This is the UNAVAILABLE case the product must report.)"
  exit 0
fi

# 2. Record focus before we touch anything (disruption measurement).
prev_app="$(frontmost_app)"
echo ">>> frontmost before: $prev_app"
echo ">>> WATCH DISCORD NOW. Sending $label ($KEY + modifiers) in 2s..."
sleep 2

# 3. Dispatch. In 'inapp' mode we must focus Discord first; in 'global' mode we send without activating.
dispatch_err=""
if [ "$KEYBIND_MODE" = "global" ]; then
  dispatch_err="$(osascript <<OSA 2>&1
tell application "System Events"
  keystroke "$KEY" using {$KEY_MODIFIERS}
end tell
OSA
)"
else
  dispatch_err="$(osascript <<OSA 2>&1
tell application "$DISCORD_APP_NAME" to activate
delay 0.35
tell application "System Events"
  keystroke "$KEY" using {$KEY_MODIFIERS}
end tell
delay 0.2
OSA
)"
  # 4. Restore the user's previous app (the whole point: don't break their focus).
  if [ -n "$prev_app" ] && [ "$prev_app" != "$DISCORD_APP_NAME" ]; then
    osascript -e "tell application \"$prev_app\" to activate" >/dev/null 2>&1
    sleep 0.3
  fi
fi

now_app="$(frontmost_app)"
echo ">>> frontmost after restore: $now_app"

# 5. Classify what we can OBJECTIVELY know. (We cannot confirm the actual Discord state here.)
if [ -n "$dispatch_err" ]; then
  if echo "$dispatch_err" | grep -qi "not allowed assistive\|1002\|accessibility"; then
    emit "$MECH" "$label-permission" "FAIL" "Accessibility permission missing: $dispatch_err"
  else
    emit "$MECH" "$label-dispatch" "FAIL" "osascript error: $dispatch_err"
  fi
  exit 0
fi

if [ "$KEYBIND_MODE" = "inapp" ]; then
  if [ "$now_app" = "$prev_app" ]; then
    emit "$MECH" "$label-focus-restore" "PASS" "focus returned to '$prev_app' (brief Discord flash during dispatch is the disruption cost)"
  else
    emit "$MECH" "$label-focus-restore" "UNKNOWN" "focus is '$now_app', expected '$prev_app' -> restore imperfect"
  fi
fi

emit "$MECH" "$label-dispatch" "UNKNOWN" "key sent without error; CONFIRMATION REQUIRED -> did Discord visibly flip $label? record PASS/FAIL by eye"
echo
echo ">>> Did Discord's $label state actually change? That answer is the real result."
echo ">>> Run 03-rpc-read.mjs to see if the state can be confirmed programmatically."
