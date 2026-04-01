# Obsidian Wikilink

Search your Obsidian vault and paste a `[[wikilink]]` directly into whatever app you're typing in — Notion, Obsidian, a notes field, anywhere.

## How it works

Open the command, type to fuzzy-search your vault notes, then:

- **Return** — paste `[[Note Name]]` into the focused app
- **⌘Return** — paste `[[Folder/Note Name]]` (full path)
- **⌘C** — copy `[[Note Name]]` to clipboard without pasting

## Setup

1. Install the extension
2. Open **Raycast Preferences → Extensions → Obsidian Wikilink**
3. Set **Vault Path** to your Obsidian vault folder (e.g. `~/vaults/MyVault`)

The default path is `~/vaults/Notes`. Supports `~` expansion.

## Notes

- Excludes `.trash`, `.smart-env`, and `Templates` folders automatically
- No Obsidian needs to be running — reads the vault directly from disk
- Works with any vault, not just Obsidian-managed ones
