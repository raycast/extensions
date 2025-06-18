on run argv
    tell application "System Events"
        delay 0.1
        keystroke (item 1 of argv)
        delay 0.1
        key code 36
        delay 0.1
        key code 36
    end tell
end run 