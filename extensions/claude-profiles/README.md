# Claude Profiles

Run several Claude Desktop accounts side by side. Each profile is an isolated
login with its own chats and settings, launched as a separate Claude window.

## Commands

- **Create Profile**: name a profile and open Claude with it. Sign in the first
  time it opens.
- **Swap Profile**: pick a saved profile and open Claude with it. Also remove a
  profile from the list, or delete it together with its data.

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
