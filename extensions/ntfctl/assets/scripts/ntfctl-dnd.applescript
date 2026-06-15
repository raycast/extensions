(*
  ntfctl-dnd.applescript
  ──────────────────────
  Toggle a Focus / Do Not Disturb mode on or off.
  Uses the macOS Shortcuts app, which ships with
  every modern Mac and exposes Focus automation.

  Prerequisites:
    • A Shortcut named "DND Until I Leave" exists by default
      on Sonoma / Sequoia.  If you renamed it, change the
      shortcutName variable below.
    • Grant "Shortcuts" permission in System Settings →
      Privacy & Security → Automation when first run.

  Bind this to a hotkey to flip DnD without opening
  Control Center.
*)

use AppleScript version "2.5"
use scripting additions

property shortcutName : "DND Until I Leave"

-- Check current Focus status (0 = off, 1 = on)
set focusStatus to do shell script "defaults -currentHost read ~/Library/Preferences/ByHost/com.apple.controlcenter.plist FocusModes 2>/dev/null || echo '[]'"

-- Toggle the shortcut (macOS will show a transient banner)
try
    do shell script "shortcuts run '" & shortcutName & "' 2>&1"
    display notification "Do Not Disturb toggled" with title "Focus" subtitle ""
on error errMsg
    if errMsg contains "no such shortcut" or errMsg contains "Couldn't find" then
        display dialog "Shortcut \"" & shortcutName & "\" not found." & return & return & ¬
            "Open Shortcuts.app and verify the name, or create a new" & return & ¬
            "shortcut that toggles your preferred Focus mode." ¬
            buttons {"OK"} default button 1 with icon caution
    else
        display notification "Failed to toggle Focus: " & errMsg with title "Focus Error"
    end if
end try
