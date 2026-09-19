#!/usr/bin/osascript

on run
    restoreAndActivate("ChatGPT")
    delay 0.2
    pressKeyCommand("n")
    delay 1
    pressKeyCommand("v")
    delay 0.1
    pressKeyReturn()
end run

on restoreAndActivate(appName)
    tell application "System Events"
        if not (exists process appName) then
            do shell script "open -a " & quoted form of appName
            delay 5
        end if
    end tell
    tell application "System Events"
        tell application process appName
            set miniaturizedWindows to every window whose value of attribute "AXMinimized" is true
            repeat with win in miniaturizedWindows
                set value of attribute "AXMinimized" of win to false
            end repeat
        end tell
    end tell

    tell application appName
        activate
    end tell
end restoreAndActivate

on pressKeyCommand(key)
    tell application "System Events" to keystroke key using {command down}
end pressKeyCommand

on pressKeyReturn()
    tell application "System Events" to keystroke return
end 

on pressKeyCommandShift(key)
    tell application "System Events" to keystroke key using {command down, shift down}
end pressKeyCommandShift
