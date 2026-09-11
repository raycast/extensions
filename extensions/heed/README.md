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
| Toggle / Turn on / Turn off Focus Follows Mouse | Heed's pointer focus, without reaching for the menu bar. |

Assign a Raycast hotkey to any of them, then free the combination Heed holds, for example:

```sh
defaults write io.github.rbstp.heed focusNextHotkey ''
```

Windows completely covered by other windows are skipped, and the order is spatial rather than
stacking, so stepping through does not reorder what you are stepping through.

## Requirements

Heed 0.12.0 or later with Accessibility permission granted. 0.12.0 is the first signed and
notarized build, so Gatekeeper opens it without a detour through System Settings:

```sh
brew install --cask rbstp/tap/heed
```

Pair it with `warpPointer` for the full effect: the cursor then follows focus into the window a
command moved it to, instead of staying behind and dragging focus back on the next mouse movement.

```sh
defaults write io.github.rbstp.heed warpPointer -bool true
```

## How it works

Each command opens a `heed://` URL, which a running Heed handles directly. The channel is one way:
Heed answers nothing back, so a command reports what it asked for rather than what came of it, and
a command sent to a Heed that is not running launches it first.

Focus Window is the one that reads rather than writes. It runs `Heed --windows`, which builds the
list from the window server and Accessibility on the spot. Picking a window asks for it by the
window server's own number, so a window opening or closing while the list is on screen cannot make
it focus the wrong one.
