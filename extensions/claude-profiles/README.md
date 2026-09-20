# Claude Profiles

Run several Claude Desktop accounts side by side. Each profile is an isolated
login with its own chats and settings, launched as a separate Claude window.

## Commands

### Switch Profile

Lists profiles from the registry shared with the `claude-profiles` CLI. A
profile with an open Claude window shows a "Running" tag.

Type a profile name or id as the command's argument to open it directly;
otherwise the argument pre-filters the list.

Actions per profile:

- **Open Claude**
- **Create Quicklink**: a root-search entry that opens that profile in one step
- **Rename**
- **Show in Finder**
- **Copy Data Dir Path**
- **Remove from List**: data stays on disk; the confirmation shows where
- **Move Profile to Trash**: the confirmation shows the folder. Refused, with a
  message, when the folder is not inside the Claude Profiles directory. The
  folder can be recovered from the Trash afterward

Folders under Claude Profiles that no list entry points at appear in a "Not in
the List" section, with Restore to List, Show in Finder, and Move Folder to
Trash.

### Create Profile

Name a profile and choose whether to open it now. If a removed profile's
folder with the same name still exists, the form says so and restores it,
unless "Create a fresh profile instead" is ticked, which gives the new folder
a numbered id.

`profiles.json` is written atomically. If it is unreadable or malformed, the
commands show the error and change nothing; profile folders are never touched
by that path.

## How it works

Each profile is a folder under `~/Library/Application Support/Claude Profiles/`,
passed to Claude Desktop as its Electron `--user-data-dir`. Claude keeps auth,
chats and settings there instead of in its default location.

## Limitations

Profiles are fully separate accounts. Nothing is shared between them. Claude
Desktop disables local pairing in any instance whose data directory is not the
default one; the profile you launch from the Dock is unaffected.

## Moving Claude Code history between profiles

A new profile shows an empty Claude Code session list. The companion CLI at
https://github.com/calebbarzee/claude-profiles moves session history into a
profile and shares this extension's profile list.
