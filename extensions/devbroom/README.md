# Devbroom for Raycast

Devbroom finds what coding agents (Claude Code, Codex, Cursor, OpenCode, Orca)
and dev tools leave behind on your Mac: build folders, caches, scratch folders
and worktrees, and tells you which ones are safe to clean. This extension needs
the Devbroom app (free) from [devbroom.com](https://devbroom.com).

## Setup

1. Install Devbroom and let it scan once.
2. In Devbroom, open Settings, Agents and integrations and choose Link devbroom. This puts
   the `devbroom` command at `~/.local/bin/devbroom`. If yours is somewhere
   else, choose it in the extension's preferences.

## Commands

- **Status**: what the app's last scan found, instantly: how much is Ready to
  clean, what needs a review, and the largest items. It never scans or cleans.
- **Scan and Clean**: scans right in Raycast, then lists everything that is Ready. Leave out
  what you want to keep, then clean the rest. Nothing is cleaned before you
  confirm. Folders go to the Trash, and you can put them back from the Trash or
  from History in Devbroom. **Delete for Good** skips the Trash and asks you to
  confirm again; your organization can turn it off. Worktrees are removed with
  git, never forced. Scan again with Cmd+R.

Cleaning runs `devbroom clean --only` for the items you chose, so Devbroom checks
each one again right before cleaning: anything that is no longer Ready is left
out and shown with its reason, and nothing new is added. Items that need a
review, and anything Ready only because a project's `.devbroom.toml` says so,
stay in the app.
