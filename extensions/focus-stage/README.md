# Focus Stage

Put one window center stage. **Toggle Focus Stage** centers the window you're working in, covers everything else on every display with a calm backdrop that follows your light or dark appearance, hides the menu bar and the Dock and, if you like, holds notifications until you're done. Run it again and everything is exactly where it was.

Tip: give **Toggle Focus Stage** a hotkey.

## Commands

| Command | What it does |
|---|---|
| Toggle Focus Stage | Starts a focus stage around the focused window, or ends the one that's on. |
| Reset Focus Stage | Ends any focus stage, even one that looks wrong or won't turn off, and restores the window, the menu bar, the Dock and notifications. |
| Focus Stage Menu Bar | Shows whether a stage is on, with Start/End Focus and the settings. |

## What happens during a session

- The focused window moves to the center at the size you picked (60–90% of the screen, or its own size). A full-screen window stays as it is.
- A plain backdrop covers every other window on all displays: other apps, the desktop, and, if you want, the same app's other windows. Nothing is hidden or quit, so the desktop comes back unchanged.
- A soft glow in your accent color marks the window, and a small "Focus Stage on" label sits in the top-left corner. Both can be turned off.
- The menu bar and the Dock are set to hide automatically (move the pointer to the screen edge to reveal them). Whichever already was is left alone. Hiding the Dock can be turned off; the window then keeps clear of it.
- Optional: notification banners are held and appear when the session ends.

Switching to another app (⌘-Tab, the Dock) or to another desktop works as usual; the backdrop stays on the desktop where you started.

## Permissions

- **Accessibility** (Raycast): to move and follow the focused window. Already granted if you use Raycast's Window Management.
- **Automation → System Events** (asked once): to switch "Automatically hide and show the menu bar" and "…the Dock" on during a session and back off afterwards.

## Holding notifications

macOS has no public API for Do Not Disturb or Focus modes. With **Hold notifications until focus ends** on, Focus Stage pauses the macOS process that draws notification banners and resumes it when the session ends. Notifications still arrive and are kept; the ones that came in show up as banners at the end, and all of them are in Notification Center.

While it's on, Notification Center doesn't open and desktop widgets don't update. If anything goes wrong, **Reset Focus Stage** resumes notifications, and so does every new session. By hand: `killall -CONT NotificationCenter` in Terminal.

## Notes

- The window is identified with `_AXUIElementGetWindow`, a private Accessibility function that window managers such as Rectangle, yabai and AltTab also use. If it's missing, Focus Stage falls back to matching window frames.
- The native part is a small Swift program compiled from `swift/` when the extension is built (Raycast's Swift support). It runs only while a stage is on.
