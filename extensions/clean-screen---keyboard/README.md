# Clean Screen & Keyboard

Blackens your screen and disables keyboard input so you can safely wipe down both your display and your keyboard without triggering anything. When you're done, click the centered button (or press Return) to instantly restore everything.

## How it works

Running the **Clean keyboard and screen** command:

- Covers **every connected display** edge-to-edge with a black overlay (multi-monitor supported).
- Suppresses keyboard input — regular keys as well as the media / volume / brightness keys — so wiping the keys can't type, switch apps, or change settings.
- Shows a single **"Done — Restore Screen & Keyboard"** button centered on your primary display.
- Restores the screen and keyboard the moment you click that button or press Return.

## Requirements

For full keyboard blocking, grant **Raycast** the Accessibility permission:

> **System Settings → Privacy & Security → Accessibility → enable Raycast**

This is required because the extension installs a system-wide event tap to consume key presses, which macOS only allows for apps with Accessibility access. The permission is granted to the Raycast app itself (the extension runs inside Raycast and inherits it).

Without Accessibility access the screen still goes black and the overlay window swallows most typed keys, but the system-wide suppression (including media keys) is skipped.

## Notes & limitations

- A few hardware key combinations are reserved by macOS below the application layer and may still function.
- The overlay only **draws** a black screen — it does not capture or record any screen content, so no Screen Recording permission is needed.
