(*
  ntfctl-latest.applescript
  ─────────────────────────
  Open Notification Center, read the most recent banner's
  title + message, and display them in a dialog (or copy
  them to the clipboard).  Press ⌘C while the dialog is
  open to copy the text.

  Bind this to a hotkey so you can "peek" at the newest
  notification without touching the trackpad.
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
            display dialog "Could not open Notification Center." buttons {"OK"} default button 1 with icon stop
            return
        end try

        try
            set allElements to entire contents of ncWindow
        on error
            tell process "ControlCenter"
                click menu bar item 2 of menu bar 1
            end tell
            display dialog "Notification Center not accessible." buttons {"OK"} default button 1 with icon stop
            return
        end try

        (* ── Walk text elements to find the first notification ── *)
        set appName to ""
        set notifTitle to ""
        set notifBody to ""

        set foundApp to false
        set foundTitle to false

        repeat with elem in allElements
            if role of elem is not "AXStaticText" then
                -- skip
            else
                try
                    set txt to value of elem
                    if txt is not missing value and txt is not "" then
                        if not foundApp then
                            set elemPos to position of elem
                            set elemY to item 2 of elemPos
                            if elemY > 40 then
                                set appName to txt
                                set foundApp to true
                            end if
                        else if not foundTitle then
                            set notifTitle to txt
                            set foundTitle to true
                        else if notifBody is "" then
                            set notifBody to txt
                            exit repeat
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

    (* ── Show result ── *)
    if appName is "" then
        display dialog "No notifications found." buttons {"OK"} default button 1 with icon note giving up after 5
    else
        set displayText to "📬  Latest Notification" & return & return & ¬
            "App:    " & appName & return & ¬
            "Title:  " & notifTitle & return & ¬
            "Body:   " & notifBody
        display dialog displayText buttons {"OK", "Copy"} default button 1 with icon note giving up after 8
        if button returned of result is "Copy" then
            set the clipboard to appName & " — " & notifTitle & return & notifBody
        end if
    end if
end tell
