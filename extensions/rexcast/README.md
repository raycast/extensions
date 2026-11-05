<p align="center">
  <img src="media/icon.png" alt="Rexcast" width="128" height="128">
</p>

# Rexcast

Rex's footprints, in Raycast. See what your terminal sessions are up to without leaving the app you're in.

Rexcast is an unofficial extension for [Rex](https://rex.superlogical.com), the terminal multiplexer by Superlogical. It is not affiliated with or endorsed by Superlogical. It talks to Rex through its `rex` command-line tool.

## Requirements

- Rex for macOS, with its server running.
- **Remote Control** turned on in Rex's settings. Showing a session in the app (`Show in Rex`) needs it. Everything else works without it.

## Commands

- **Session Activity** (menu bar): the server's status (version, uptime, Tailscale host) and one submenu per session with its state (working, needs your input, finished, failed or idle), what it is doing, its tabs and panes. The title shows `!` when a session needs your input, `✕` when one failed, the number of working sessions, or `✓` when one finished. With **Show Notifications** turned on (it is off by default) you also get a message when a session needs you, finishes or fails. Remove it from its own menu with `Remove from Menu Bar`, and bring it back with **Show Menu Bar Item**.
- **Peek at Session**: the screen of any session, without opening Rex.
- **Open Finder Folder in Rex**: a new session in the folder selected in Finder.
- **Send Text to Session**: type text or the clipboard into the focused pane of a session, without focusing Rex.
- **Manage Sessions**, **New Session**, **Run Command**, **Open Rex**: the basics.

Splitting, zooming, focusing panes and switching sessions are already in Rex's own command palette, so they aren't repeated here.

## How the status is detected

Rexcast reads what Rex already knows about each pane, every 15 seconds and without reading its output:

- **Programs that report their status** (Claude Code does) say themselves whether they are working, **blocked** (waiting for you: a permission, a question or a login), done, or failed. A blocked session gets the "!" in the menu bar, and a message if **Show Notifications** is turned on.
- **Any other program** counts as working while it runs in the foreground of the pane, and as finished when the shell is back at its prompt.

A finished or failed session keeps its mark until you open it. A program that neither reports its status nor runs in the foreground (for example one sent to the background with `&`) shows as idle.

## Preferences

- **Rex CLI Path** (optional): by default Rexcast looks for `rex` where the Rex app installs it.
- **Show Notifications** (Session Activity command, off by default): a message shown when a session needs your input, finishes or fails. It is off by default because showing it closes the Raycast window if it is open, and Rex already sends its own notifications. **Notification Length** sets how long it stays up (2 or 6 seconds).
