# Clean Windows Keyboard

Lock your keyboard for cleaning purposes. This extension is designed for **Raycast for Windows**.

![Clean Windows Keyboard Icon](icon.png)
## Features

- **Lock Keyboard**: Blocks all keyboard input globally to allow for cleaning.
- **Durations**: Select from various durations (15s, 30s, 1m, etc.).
- **Safety Unlock**: Press `Ctrl + U` at any time to immediately unlock the keyboard.
- **Visual Timer**: See exactly how much time is left.

## Requirements

- **Raycast for Windows**
- **.NET Framework 4.x** (Standard on most Windows installations)

## How it Works

This extension uses a lightweight C# helper executable (`KeyboardBlocker.exe`) to interface with the Windows API (`SetWindowsHookEx`).
- The helper is compiled locally on your machine during installation using the standard Windows C# compiler (`csc.exe`).
- Source code for the helper is available in `src/native/KeyboardBlocker.cs`.

## Troubleshooting

**Keyboard didn't unlock?**
- Press `Ctrl + U`.
- If that fails, you can use your mouse to click "Unlock Now" in the Raycast window.
- In the worst case, you can close Raycast or use Task Manager to kill `KeyboardBlocker.exe`.

## License

MIT
