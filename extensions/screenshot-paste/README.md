# Screenshot Paste

Screenshot Paste captures displays and pastes PNG screenshots into the app where you are typing, without mouse interaction.

## Commands

- **Paste New Screenshot: Screen Under Cursor** captures the display under the mouse pointer and pastes it where you are typing.
- **Paste New Screenshot: Choose Screen** lists your displays, highlights the selected physical screen, then captures and pastes only the display you confirm.

Moving the selection keeps the matching physical display tinted and shows its number until you confirm or close the command. No screenshot is taken while you browse the list. Saved screenshots are best browsed with Raycast's built-in **Search Screenshots** or **Paste Latest Screenshot**.

The chosen capture is staged in Raycast's support folder and saved to the screenshot folder when **After Pasting** is set to save.

Bind a hotkey in **Raycast Settings → Extensions → Screenshot Paste** by selecting a command and recording its hotkey.

## Permissions

| Permission | Needed for | Without it you will see |
| --- | --- | --- |
| Screen Recording (macOS calls it **Screen & System Audio Recording**; no audio is ever recorded) | Every capture | “Capture failed. Allow Raycast in System Settings > Privacy & Security > Screen Recording.” |
| Accessibility | Only the **Paste As: Image** mode (the extension presses Cmd-V for you) | “Pressing Cmd-V failed. Allow Raycast in System Settings > Privacy & Security > Accessibility (required by the Image paste mode).” |

The default **File** mode needs no Accessibility permission, and macOS shows each consent prompt only once—if you dismissed it, grant it manually in System Settings.


## Preferences

- **Screenshot Directory** controls where PNG files are saved.
- **After Pasting** saves the pasted screenshot to the screenshot folder or discards it. In discard mode, image data can be removed immediately; file attachments remain staged for up to 10 minutes so the receiving app has time to read them.
- **Paste As** controls the clipboard format. **File (attachment)** holds the PNG file, like dragging it from Finder, and works in Slack, Cursor, Teams, Mail, and Messages. **Image (pixel data)** holds pixel data, like Cmd-Shift-Ctrl-4, for apps that reject files; it needs Accessibility permission for Raycast.
- **Capture Delay** is the wait in milliseconds after Raycast closes and before capture begins.
