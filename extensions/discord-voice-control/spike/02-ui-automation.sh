#!/usr/bin/env bash
# Phase 1 spike: UI AUTOMATION FALLBACK (read-only probe)
# Tests whether Discord's mute/deafen controls expose STABLE Accessibility metadata
# we could read (for confirmation) or click (for fallback control) WITHOUT fragile coordinates.
#
# This script only INSPECTS the accessibility tree and dumps button/control descriptions.
# It does NOT click anything by default (clicking is the fallback control path; inspect first).
#
# Usage:
#   ./02-ui-automation.sh inspect      # dump Discord's accessible UI elements (look for mute/deafen)
#
# Requires: System Settings > Privacy & Security > Accessibility -> allow Terminal (or your shell app).

set -uo pipefail
SPIKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SPIKE_DIR/lib.sh"

MECH="ui-automation"
action="${1:-inspect}"

if ! discord_is_running; then
  emit "$MECH" "inspect-precondition" "FAIL" "Discord not running; cannot inspect UI tree"
  exit 0
fi

if [ "$action" != "inspect" ]; then
  echo "usage: $0 inspect"; exit 2
fi

echo ">>> Activating Discord to inspect its accessibility tree..."
osascript -e "tell application \"$DISCORD_APP_NAME\" to activate" >/dev/null 2>&1
sleep 0.6

# Discord (Electron) often exposes a flat web area. We walk the front window's UI elements
# and print role + description + help + name, searching for mute/deafen affordances.
DUMP="$(osascript <<'OSA' 2>&1
on joinList(lst, sep)
  set AppleScript's text item delimiters to sep
  set s to lst as text
  set AppleScript's text item delimiters to ""
  return s
end joinList

tell application "System Events"
  if not (exists process "Discord") then return "ERR: no Discord process"
  tell process "Discord"
    set out to {}
    try
      set win to front window
    on error
      return "ERR: no front window"
    end try
    -- shallow-ish recursive scan capped to keep output bounded
    set elementQueue to {win}
    set depthGuard to 0
    repeat while (length of elementQueue) > 0 and depthGuard < 1200
      set depthGuard to depthGuard + 1
      set el to item 1 of elementQueue
      set elementQueue to rest of elementQueue
      try
        set r to role of el as text
      on error
        set r to "?"
      end try
      set d to ""
      try
        set d to description of el as text
      end try
      set h to ""
      try
        set h to help of el as text
      end try
      set blob to (r & " | " & d & " | " & h)
      if blob contains "ute" or blob contains "eafen" or blob contains "oice" then
        set end of out to ("HIT: " & blob)
      end if
      try
        set kids to UI elements of el
        repeat with k in kids
          set end of elementQueue to k
        end repeat
      end try
    end repeat
    if (length of out) is 0 then return "NO-HITS (no mute/deafen/voice accessibility metadata found in front window)"
    return my joinList(out, "
")
  end tell
end tell
OSA
)"

echo "----- accessibility scan -----"
echo "$DUMP"
echo "------------------------------"

if echo "$DUMP" | grep -qi "^ERR:"; then
  if echo "$DUMP" | grep -qi "not allowed\|1002\|assistive"; then
    emit "$MECH" "inspect-permission" "FAIL" "Accessibility permission missing: $DUMP"
  elif echo "$DUMP" | grep -qi "no front window"; then
    emit "$MECH" "inspect" "UNKNOWN" "Discord running but has NO open window (closed to tray/minimized). Real edge case: UI automation cannot act without an open window -> extension must detect & report this. Open Discord's main window and re-run."
  else
    emit "$MECH" "inspect" "FAIL" "$DUMP"
  fi
elif echo "$DUMP" | grep -qi "^HIT:"; then
  emit "$MECH" "inspect" "PASS" "Found mute/deafen/voice accessibility metadata -> stable selector MAY be possible (review HIT lines)"
elif echo "$DUMP" | grep -qi "NO-HITS"; then
  emit "$MECH" "inspect" "UNKNOWN" "No accessible mute/deafen labels exposed (Electron web area opaque) -> fallback likely needs coordinates (fragile)"
else
  emit "$MECH" "inspect" "UNKNOWN" "Inconclusive scan output; review manually"
fi
