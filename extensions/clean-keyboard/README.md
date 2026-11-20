# Clean Keyboard

Lock your keyboard to clean it easily.

Due to the limitation from the operating system level, some crucial keys like Fn key, media controls (volume, play/pause, etc.) or the Touch ID button are unaffected by this extension.

With mouse-click locking off, press `Ctrl + U` at any time to reenable the keyboard. With mouse-click locking on, this shortcut opens Touch ID instead.

On macOS Tahoe (26+), you can enable **Lock Fn / function row keys** in the extension preferences to also block the function row while cleaning.

## Also lock mouse clicks (macOS)

Enable **Lock Mouse Clicks** in Clean Keyboard preferences to block clicks and dragging while keeping the pointer and scrolling available. The existing **Lock Keyboard** command, duration list, default-duration preference, and Ask AI tool all use this setting. It is off by default and is ignored on Windows.

This option requires enrolled Touch ID plus Accessibility and Input Monitoring access. Missing access is reported without repeatedly opening permission dialogs.

- Press **Ctrl+U**, or tap either or both **Command** keys three times within 1.5 seconds, to open Touch ID.
- Press **Escape** to cancel Touch ID and keep the lock active.
- Hold **both Command keys for eight seconds** to force release without authentication.

Timed sessions release automatically. The existing native event handler also releases input if its Raycast parent exits, its event loop stops responding, or the Mac sleeps or changes user session/display configuration. System-handled keys such as Fn, media keys, and Touch ID remain subject to the operating-system limitations above.

The recovery hold does not authenticate, so use the macOS lock screen when privacy matters.
