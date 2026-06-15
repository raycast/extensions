(*
  ntfctl-dismiss.applescript
  ──────────────────────────
  Dismiss only the newest / top-most notification
  from Notification Center — like swiping it away,
  but driven by a keyboard shortcut.
*)

use AppleScript version "2.5"
use scripting additions

tell application "System Events"
    (* ── Open Notification Center ── *)
    tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
    end tell
    delay 0.7

    tell process "NotificationCenter"
        try
            set ncWindow to item 1 of (every window)
        on error
            return
        end try

        try
            set allElements to entire contents of ncWindow
        on error
            -- UI hierarchy changed mid-traversal; bail gracefully
            tell process "ControlCenter"
                click menu bar item 2 of menu bar 1
            end tell
            return
        end try

        set didDismiss to false

        (* ── Find the top-most 20×20 dismiss button (not the NC close btn) ── *)
        repeat with elem in allElements
            if role of elem is "AXButton" then
                try
                    set btnSize to size of elem
                    set btnW to item 1 of btnSize
                    set btnH to item 2 of btnSize

                    if btnW ≤ 24 and btnH ≤ 24 then
                        set btnPos to position of elem
                        set btnY to item 2 of btnPos
                        -- NC close button is at y ≈ 26; real dismiss buttons are > 30
                        if btnY > 30 then
                            click elem
                            set didDismiss to true
                            exit repeat
                        end if
                    end if
                end try
            end if
        end repeat

        if not didDismiss then
            -- Fallback: try keyboard navigation + delete
            try
                keystroke tab
                delay 0.1
                keystroke tab
                delay 0.1
                key code 51 -- Delete key
            end try
        end if
    end tell

    (* ── Close Notification Center ── *)
    delay 0.3
    tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
    end tell
end tell
