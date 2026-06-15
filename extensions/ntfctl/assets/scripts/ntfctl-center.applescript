(*
  ntfctl-center.applescript
  ─────────────────────────
  Toggle Notification Center open / closed.
  Simple companion script — bind to F6 or ⌥N.
*)

use AppleScript version "2.5"
use scripting additions

tell application "System Events"
    tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
    end tell
end tell
