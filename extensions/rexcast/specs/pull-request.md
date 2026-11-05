<!-- Draft of the pull request for raycast/extensions. Not part of the extension (see .raycastignore). -->

# Title
Add Rexcast

## Description

Adds **Rexcast**, an unofficial extension for [Rex](https://rex.superlogical.com), the terminal multiplexer by
Superlogical. It talks to Rex through its `rex` command-line tool and shows what your terminal sessions are doing
without leaving the app you're in.

Commands:

- **Session Activity** (menu bar): the server's status and one submenu per session with its state (working, needs
  your input, finished, failed or idle), what it is doing, its tabs and panes. A message is shown when a session
  needs you, finishes or fails; it can be turned off in the command's preferences.
- **Peek at Session**: the screen of any session, without opening Rex.
- **Send Text to Session**: type text or the clipboard into a session's focused pane.
- **Open Finder Folder in Rex**: a new session in the folder selected in Finder.
- **Manage Sessions**, **New Session**, **Run Command**, **Open Rex**, **Show Menu Bar Item**.

How the state is detected: Rex already exposes, per pane, the status that programs report themselves (working,
blocked, done, error; Claude Code does) and the foreground process. Rexcast reads those every 15 seconds, without
reading any output.

Requirements: Rex for macOS (currently in Beta) with its server running. "Show in Rex" also needs *Remote
Control* turned on in Rex's settings; the rest works without it. Splitting, zooming and focusing panes are left
out on purpose, because Rex's own command palette already covers them.

### Notes for the reviewer

- To try it you need Rex: https://rex.superlogical.com. Open a few sessions, run a long command (`sleep 30`) in one
  and look at **Session Activity** in the menu bar.
- The menu bar command polls with `--autostart=false`, so it never starts the Rex server just to look.
- I tested it with a real Claude Code asking for a permission: the item shows `!`, the session shows "Needs your
  input", and one message is shown.

## Screencast

Screenshots are in `metadata/` (five, 2000×1250): Manage Sessions, Peek at Session, Send Text to Session,
Run Command, and the menu bar dropdown.

## Checklist

- [x] I read the [extension guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [x] I read the [documentation about publishing](https://developers.raycast.com/basics/publish-an-extension)
- [x] I ran `npm run build` and tested this distribution build in Raycast
- [x] I checked that files in the `assets` folder are used by the extension itself
- [x] I checked that assets used in the `README` are located outside the metadata folder if they were not generated with our metadata tool
