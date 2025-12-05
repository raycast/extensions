#Requires AutoHotkey v2.0

; Windows 11 shortcut: Win+N opens Do Not Disturb settings
Send("{LWin down}n{LWin up}")
Sleep(500)

; Navigate to Focus Assist section
Send("{Tab}")
Sleep(100)

; Toggle it
Send("{Enter}")
Sleep(300)
Send("{Esc}")

ExitApp
