# Choosing Screenshot Hotkeys

Snap & Grab provides two Store extension commands. Raycast users assign each global hotkey once; the extension cannot install default bindings.

| Command                   | Suggested hotkey        |
| ------------------------- | ----------------------- |
| Capture and Copy          | Control+Command+4 (⌃⌘4) |
| Select Recent Screenshots | Control+Command+5 (⌃⌘5) |

In Raycast v2, search for the command without running it, press Command+K, open Configure, and choose Set Hotkey. Record the desired combination. To migrate from the old Script Command, clear its conflicting hotkey with the ✕ control first.

Hold the Capture and Copy shortcut modifiers, press its character key once, and draw a screenshot. Further presses while the modifiers stay held add older saved screenshots. Release a required modifier to copy. The helper detects the modifiers used to launch it, so there is no second shortcut preference to synchronize.

In Select Recent Screenshots, use the arrow keys to browse, Return to toggle selection, and Command+Return to copy. These internal controls work without assigning global hotkeys.

To replace Command+Shift+4, first disable or reassign the macOS binding in System Settings → Keyboard → Keyboard Shortcuts → Screenshots. Native Screenshot may interpret held modifiers such as Shift while drawing; test the gesture before relying on it. Modifier-free hotkeys support a single capture but cannot hold a history-selection session open.
