# Clean Keyboard

Lock your keyboard to clean it easily.

Due to the limitation from the operating system level, some crucial keys like Fn key, media controls (volume, play/pause, etc.) or the Touch ID button are unaffected by this extension.

To reenable the keyboard, simply press `Ctrl + U` at any time.

On macOS Tahoe (26+), you can enable **Lock Fn / function row keys** in the extension preferences to also block the function row while cleaning.

## Lock Keyboard and Mouse (macOS)

**Lock Keyboard and Mouse** blocks typing and clicks while the desktop stays visible and scrolling still works. Use it to leave a video or document on screen without anyone typing or clicking into it.

1. Run **Lock Keyboard and Mouse**, choose a duration, and press Enter. The Raycast window closes and the keyboard and mouse stay blocked.
2. To unlock, tap either or both Command keys three times within 1.5 seconds, then use Touch ID.
3. If Touch ID or the tap gesture fails, hold both Command keys for 8 seconds to unlock without authentication.

Timed sessions unlock automatically when the duration ends. **Forever** has no time limit, so choose a timed session if you want a way out that doesn't depend on the keyboard.

Anyone who knows the 8-second hold can unlock, so this is not a replacement for the macOS lock screen.

Lock Keyboard and Mouse needs an enrolled Touch ID fingerprint, plus **Accessibility** (to block input) and **Input Monitoring** (to detect the unlock gesture) in System Settings → Privacy & Security. macOS asks for them on first use, and the command won't lock until they're granted. The lock also ends if the Mac sleeps, the display configuration changes, or the user session switches.
