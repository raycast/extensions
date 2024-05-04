#!/usr/bin/osascript

on run
    tell application "ChatGPT" to activate
    delay 0.2
    pressKeyCommandShift("o")
    delay 0.3
    pressKeyCommand("v")
    delay 0.1
    pressKeyReturn()
end run

on pressKeyCommand(key)
    tell application "System Events" to keystroke key using {command down}
end pressKeyCommand

on pressKeyReturn()
    tell application "System Events" to keystroke return
end 

on pressKeyCommandShift(key)
    tell application "System Events" to keystroke key using {command down, shift down}
end pressKeyCommandShift
