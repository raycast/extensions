# CCSwap

See how much of each Claude Code and Codex account's quota is left, and switch accounts from Raycast.

## Setup

This extension runs the [ccswap](https://github.com/errhythm/ccswap) CLI. Install it first:

```sh
uv tool install ccswap   # or: pipx install ccswap
```

Then add your accounts with `ccswap add` (see the ccswap README).

The extension looks for `ccswap` in `~/.local/bin`, `/opt/homebrew/bin` and `/usr/local/bin`. If yours is somewhere else, pick it in **ccswap Path** in the extension preferences (`which ccswap` prints where it is).

## Commands

- **Show Accounts** lists every account with its 5-hour and 7-day usage. Press Enter to switch to an account, or ⌘B to switch to the one with the most quota left.
- **Switch to Best Account** switches Claude Code to the account with the most quota left, without opening a window.

## After a switch

Claude Code sessions that are already open start using the new account on their next message, or within about 30 seconds when the login lives in the macOS Keychain. Restart Claude Code if you don't want to wait. A running Codex session keeps the old account until you restart it.

## Privacy

The extension only runs `ccswap list --json` and `ccswap switch`. It never reads credentials or the Keychain itself, and it sends nothing over the network. ccswap does the account work locally.
