(*
  ntfctl-count.applescript
  ────────────────────────
  Count currently visible notifications in
  Notification Center and show a badge-like dialog.
*)

use AppleScript version "2.5"
use scripting additions

tell application "System Events"
    tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
    end tell
    delay 0.7

    tell process "NotificationCenter"
        try
            set ncWindow to item 1 of (every window)
        on error
            display dialog "0 notifications" buttons {"OK"} default button 1 with icon note giving up after 3
            return
        end try

        try
            set allElements to entire contents of ncWindow
        on error
            tell process "ControlCenter"
                click menu bar item 2 of menu bar 1
            end tell
            display dialog "0 notifications" buttons {"OK"} default button 1 with icon note giving up after 3
            return
        end try

        set txtCount to 0

        repeat with elem in allElements
            if role of elem is "AXStaticText" then
                try
                    set txt to value of elem
                    if txt is not missing value and txt is not "" then
                        set elemPos to position of elem
                        if (item 2 of elemPos) > 30 then
                            set txtCount to txtCount + 1
                        end if
                    end if
                end try
            end if
        end repeat
    end tell

    (* ── Close Notification Center ── *)
    tell process "ControlCenter"
        click menu bar item 2 of menu bar 1
    end tell

    -- Rough estimate: 3 text elements per notification (app, title, body)
    set estimatedCount to txtCount div 3
    if estimatedCount < 0 then set estimatedCount to 0

    set pluralSuffix to "s"
    if estimatedCount is 1 then set pluralSuffix to ""

    display dialog "~" & estimatedCount & " notification" & pluralSuffix ¬
        buttons {"OK"} default button 1 with icon note giving up after 5
end tell
