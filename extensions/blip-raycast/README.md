# Blip

Send files, folders, text, and your clipboard to your devices and contacts with [Blip](https://blip.net), and manage transfers, without leaving Raycast. Blip's own windows never open.

## Commands

| Command | What it does |
| --- | --- |
| **Send Anything** | Choose what to send (the clipboard, the Finder or File Explorer selection, typed text or files you pick), then who to send it to. |
| **Send Clipboard** | Send what you copied (text, an image or files) to a device or contact. |
| **Send Selected Files** | Send everything selected in Finder or File Explorer to a device or contact. |
| **Quick Send Clipboard** | Send the clipboard to your Quick Send recipient right away, without opening a window. |
| **Quick Send Selected Files** | Send the selected files to your Quick Send recipient right away, without opening a window. |
| **Manage Transfers** | See progress and speed, accept or decline incoming files, pause, resume or cancel, open received files, and clear history. |

You can send to your other devices (the dot shows which are online), your contacts, or anyone on Blip: type at least three letters of a name or email to search. Text arrives as a `.txt` file, just like Blip's own **Paste** button sends it.

## Quick Send

Give **Quick Send Clipboard** and **Quick Send Selected Files** a hotkey in Raycast Settings → Extensions → Blip. The first time you use one, it asks who to send to and remembers your choice (marked ⚡). After that it sends right away.

To change the recipient, select someone else in any recipient list and choose **Use for Quick Send** (⌘⇧D, or Ctrl+Shift+D on Windows).

## Blip Settings

Blip's settings are in the extension preferences: auto-accept, saving received media to Photos (macOS), where received files are saved, and sending and receiving speed limits.

Raycast can't show Blip's current values there, so every setting starts as *Keep Blip's setting*. When you change one, it's applied to Blip the next time you use any Blip command. Set it back to *Keep Blip's setting* (or clear the field) to manage it in Blip again.

## Requirements

- [Blip](https://blip.net) installed and signed in. If Blip isn't running, the extension starts it in the background.
- No Accessibility permission is needed.
- On Windows, a small built-in helper talks to Blip, because Node.js can't open Blip's local connection there.

## Compatibility

Blip has no public API, so this extension talks to the Blip app on your computer the same way Blip's own window does. A Blip update can change that; if it does, the extension tells you instead of failing silently, and an extension update will follow. Nothing leaves your computer except through Blip itself, and the extension never reads your Blip login.
