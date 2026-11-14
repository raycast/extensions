# Heed

Move keyboard focus between windows from Raycast, and turn focus follows mouse on and off.

[Heed](https://github.com/rbstp/heed) is a window focus agent for macOS, inspired by Hyprland:
`movefocus` for stepping between windows, `follow_mouse` for the pointer. It registers its own
global hotkeys, and every combination it claims is gone from every other app. This extension is the
way to get those combinations back: Raycast owns the hotkey, Heed claims nothing.

## Commands

| Command | What it does |
| --- | --- |
| Focus Next / Previous Window | Step through the visible windows, screen by screen from left to right, then left to right within each screen. |
| Focus Window Left / Right / Above / Below | Move to the nearest window in that direction. Sharing a row or column beats being closer, and the edge is a dead end rather than a wrap. |
| Focus Window | Every visible window by name, in that same order, with the app it belongs to and its size. Pick one to focus it. |
| Toggle / Enable / Disable Focus Follows Mouse | Heed's pointer focus, without reaching for the menu bar. |
| Release / Restore Shortcuts | Unregister every shortcut Heed holds, so the combinations are free for Raycast, or give Heed its defaults back. |
| Enable / Disable Mouse Follows Focus | The pointer follows a command into the window it focused, instead of staying behind and dragging focus back on the next mouse movement. |

Assign a Raycast hotkey to any of the focus commands, then run **Release Shortcuts** once so Heed
lets go of the combinations. That frees every shortcut Heed holds, the numbered ones included, which
no command here replaces; to keep some, clear single fields in Heed's **Settings** window instead,
from its menu bar icon or with `open heed://settings`. Either takes effect at once.

Windows completely covered by other windows are skipped, and the order is spatial rather than
stacking, so stepping through does not reorder what you are stepping through.

## Requirements

Heed 0.13.0 or later on Apple silicon, macOS 14 or later, with Accessibility permission granted.
Releases are signed and notarized, so Gatekeeper opens them without a detour through System Settings:

```sh
brew install --cask rbstp/tap/heed
```

## How it works

Each command opens a `heed://` URL, which a running Heed handles directly. The channel is one way:
Heed answers nothing back, so a command reports what it asked for rather than what came of it, and
a command sent to a Heed that is not running launches it first.

Focus Window is the one that reads rather than writes. It runs `Heed --windows`, which builds the
list from the window server and Accessibility on the spot. Picking a window asks for it by the
window server's own number, so a window opening or closing while the list is on screen cannot make
it focus the wrong one.
