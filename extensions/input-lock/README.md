# Input Lock

A Raycast extension that locks the keyboard and trackpad (and any mouse) until you type a secret key sequence. Handy for wiping the keyboard, keeping a toddler or cat out, or leaving a video running.

## How it works

Raycast extensions run in Node and can't intercept input, so the lock is done by a small Swift helper (`assets/input-lock-helper.swift`). It installs a HID-level `CGEventTap` that swallows:

- every key press, including media/brightness/volume keys and system shortcuts like ⌘Tab, ⌘Space and ⌘⌥Esc
- clicks, scrolling, cursor movement (the cursor is frozen in place) and trackpad gestures (Mission Control swipes, pinch, and so on)

The helper watches the swallowed keystrokes. When the last N characters you typed match your unlock sequence, it exits and input comes back. Wrong keys don't reset anything, so you can just start typing the sequence again.

A prebuilt universal (Apple Silicon + Intel) helper ships in `assets/`; `npm run dev` / `npm run build` rebuild it from source. If the binary is missing, the extension compiles the source on first run instead (needs Xcode Command Line Tools).

## Commands

| Command | |
|---|---|
| **Lock Keyboard & Trackpad** | Blocks everything (pointer blocking can be switched off in its preferences) |
| **Lock Keyboard Only** | Blocks keys but keeps the trackpad working, for wiping the keyboard |

Both take an optional **duration** argument that overrides the auto-unlock preference for that lock: `5m`, `90s`, `1h30m`, or a plain number of minutes. `0` means no timer.

When unlocked you hear the Glass sound and the overlay briefly turns into a green "Unlocked" panel ("Auto-unlocked" if the safety timer fired).

## Setup

```bash
npm install && npm run dev
```

1. Building from source requires the Xcode Command Line Tools (`xcode-select --install`).
2. On first launch Raycast asks you to set an **Unlock Sequence** (at least 3 characters, case-insensitive).
3. Raycast needs **Accessibility** permission (System Settings → Privacy & Security → Accessibility). Raycast usually has it already. If locking fails with a permission error, also enable Raycast under **Input Monitoring**.

## Preferences

| Preference | Default | |
|---|---|---|
| Unlock Sequence | — | What you type to unlock |
| Auto-Unlock After (minutes) | `10` | Safety net if you forget the sequence. `0` disables it |
| Also block trackpad & mouse | on | *Lock Keyboard & Trackpad* only |
| Show lock overlay | on | Small panel with a progress dot for each correct character |
| Play a sound when unlocked | on | Glass sound plus a brief "Unlocked" confirmation |

## Safety notes

- **Secure keyboard entry:** while it's on (a focused password field, Terminal's "Secure Keyboard Entry", some password managers), macOS hides keystrokes from event taps. The extension refuses to lock in that state, and unlocks itself if secure input turns on during a lock, so you can't get stuck.
- **Power / Touch ID button:** the extension can't block it. That's the last resort.
- **Emergency unlock from another machine:** `ssh` in and run `pkill input-lock-helper`.
