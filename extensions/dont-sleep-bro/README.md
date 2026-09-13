# Don't Sleep Bro

Keep your Mac awake with the **lid closed** — including on **battery**.

Unlike tools that only call `caffeinate`, this extension also sets `pmset disablesleep`, which is what actually blocks sleep when you close the lid off power.

## Commands

| Command | What it does |
| --- | --- |
| **Start Keep Awake** | Disable sleep (admin once) + run `caffeinate` |
| **Stop Keep Awake** | Restore normal sleep timers |
| **Check Status** | Show ON/OFF and current `pmset` values |

## Admin password

Start and Stop need administrator privileges once each session of changes. macOS shows the standard password dialog (`osascript` + `pmset`). Cancel anytime — nothing partial is left in a broken state beyond the usual cancel of that dialog.

## When you're done

Always run **Stop Keep Awake** (or the CLI `dont_sleep_bro off`) so your Mac can sleep again.

## How it works

1. `pmset -a disablesleep 1` and zero sleep timers (battery + AC)
2. Background `caffeinate -dimu` (display, idle, disk, user-active)
3. State in `~/.cache/dont_sleep_bro/`

## Optional CLI

If you also installed the shell helper at `~/.local/bin/dont_sleep_bro`, it shares the same state directory with this extension.
