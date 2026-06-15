(*
  ntfctl.applescript
  ──────────────────────────
  Unified notification controller — one script, many actions.
  
  Usage (from command line):
    osascript ntfctl.applescript clear
    osascript ntfctl.applescript latest
    osascript ntfctl.applescript dismiss
    osascript ntfctl.applescript dnd
    osascript ntfctl.applescript count
    osascript ntfctl.applescript center
  
  Bind different hotkeys to different commands,
  or create wrapper .command files that call into this.
*)

on run argv
    if (count of argv) = 0 then
        display dialog "Usage:  osascript ntfctl.applescript <action>" & return & return & ¬
            "Actions:  clear | latest | dismiss | dnd | count | center" ¬
            buttons {"OK"} default button 1 with icon note
        return
    end if

    set action to item 1 of argv

    if action is "clear" then
        doClear()
    else if action is "latest" then
        doLatest()
    else if action is "dismiss" then
        doDismiss()
    else if action is "dnd" then
        doDnD()
    else if action is "count" then
        doCount()
    else if action is "center" then
        doCenter()
    else
        display dialog "Unknown action: " & action & return & return & ¬
            "Valid: clear | latest | dismiss | dnd | count | center" ¬
            buttons {"OK"} default button 1 with icon stop
    end if
end run

(* ── Clear all notifications ── *)
on doClear()
    tell application "System Events"
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
                set allElements to {}
            end try
            if (count of allElements) = 0 then
                tell process "ControlCenter"
                    click menu bar item 2 of menu bar 1
                end tell
                return
            end if

            set dismissed to 0

            repeat with elem in allElements
                if role of elem is "AXButton" then
                    try
                        set btnSize to size of elem
                        set btnW to item 1 of btnSize
                        set btnH to item 2 of btnSize
                        if btnW ≤ 24 and btnH ≤ 24 then
                            set btnPos to position of elem
                            set btnY to item 2 of btnPos
                            if btnY > 30 then
                                click elem
                                set dismissed to dismissed + 1
                                delay 0.15
                            end if
                        end if
                    end try
                end if
            end repeat

            if dismissed is 0 then
                do shell script "killall NotificationCenter 2>/dev/null; true"
            end if
        end tell

        delay 0.3
        tell process "ControlCenter"
            click menu bar item 2 of menu bar 1
        end tell
    end tell
end doClear

(* ── Peek at latest notification ── *)
on doLatest()
    tell application "System Events"
        tell process "ControlCenter"
            click menu bar item 2 of menu bar 1
        end tell
        delay 0.7

        tell process "NotificationCenter"
            try
                set ncWindow to item 1 of (every window)
            on error
                display dialog "No notifications." buttons {"OK"} default button 1 with icon note giving up after 5
                return
            end try

            try
                set allElements to entire contents of ncWindow
            on error
                set allElements to {}
            end try
            if (count of allElements) = 0 then
                tell process "ControlCenter"
                    click menu bar item 2 of menu bar 1
                end tell
                display dialog "No notifications found." buttons {"OK"} default button 1 with icon note giving up after 5
                return
            end if

            set appName to ""
            set notifTitle to ""
            set notifBody to ""
            set foundApp to false
            set foundTitle to false

            repeat with elem in allElements
                if role of elem is "AXStaticText" then
                    try
                        set txt to value of elem
                        if txt is not missing value and txt is not "" then
                            set elemPos to position of elem
                            set elemY to item 2 of elemPos
                            if not foundApp then
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

        tell process "ControlCenter"
            click menu bar item 2 of menu bar 1
        end tell

        if appName is "" then
            display dialog "No notifications found." buttons {"OK"} default button 1 with icon note giving up after 5
        else
            set displayText to "📬  " & appName & return & ¬
                "     " & notifTitle & return & ¬
                "     " & notifBody
            display dialog displayText buttons {"OK", "Copy"} default button 1 with icon note giving up after 8
            if button returned of result is "Copy" then
                set the clipboard to appName & " — " & notifTitle & return & notifBody
            end if
        end if
    end tell
end doLatest

(* ── Dismiss newest notification ── *)
on doDismiss()
    tell application "System Events"
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
                set allElements to {}
            end try
            if (count of allElements) = 0 then
                tell process "ControlCenter"
                    click menu bar item 2 of menu bar 1
                end tell
                return
            end if

            set didDismiss to false

            repeat with elem in allElements
                if role of elem is "AXButton" then
                    try
                        set btnSize to size of elem
                        set btnW to item 1 of btnSize
                        set btnH to item 2 of btnSize
                        if btnW ≤ 24 and btnH ≤ 24 then
                            set btnPos to position of elem
                            set btnY to item 2 of btnPos
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
                try
                    keystroke tab
                    delay 0.1
                    keystroke tab
                    delay 0.1
                    key code 51
                end try
            end if
        end tell

        delay 0.3
        tell process "ControlCenter"
            click menu bar item 2 of menu bar 1
        end tell
    end tell
end doDismiss

(* ── Toggle Do Not Disturb ── *)
on doDnD()
    try
        do shell script "shortcuts run 'DND Until I Leave' 2>&1"
        display notification "Do Not Disturb toggled" with title "Focus" subtitle ""
    on error errMsg
        display notification "DnD toggle failed: " & errMsg with title "Focus Error"
    end try
end doDnD

(* ── Count notifications ── *)
on doCount()
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
                set allElements to {}
            end try
            if (count of allElements) = 0 then
                tell process "ControlCenter"
                    click menu bar item 2 of menu bar 1
                end tell
                display dialog "0 notifications" buttons {"OK"} default button 1 with icon note giving up after 3
                return
            end if

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

        tell process "ControlCenter"
            click menu bar item 2 of menu bar 1
        end tell

        set estimated to txtCount div 3
        if estimated < 0 then set estimated to 0

        set pluralSuffix to "s"
        if estimated is 1 then set pluralSuffix to ""

        display dialog "~" & estimated & " notification" & pluralSuffix ¬
            buttons {"OK"} default button 1 with icon note giving up after 5
    end tell
end doCount

(* ── Toggle Notification Center ── *)
on doCenter()
    tell application "System Events"
        tell process "ControlCenter"
            click menu bar item 2 of menu bar 1
        end tell
    end tell
end doCenter
