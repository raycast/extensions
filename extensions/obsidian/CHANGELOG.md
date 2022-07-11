# Obsidian Changelog

## [Tag Filter, Markdown Controls for Edit Note, Templates for Append Action & More | Version 1.7.0] - 2022-07-11

- Add tag filter to filter results in `Search Note` and `Pinned Notes` command by tags (YAML frontmatter and inline)
- `Edit Note` action now supports markdown controls (e.g. `cmd + b` for bold and `cmd + i` for italic)
- `Append to Note` and `Append Selected Text to Note` actions now support all templates
- Add template preference for both `Append to Note` and `Append Selected Text to Note` actions
- Use `{content}` for `Append Selected Text to Note` action
- Add templates `{selected}`, `{selectedText}` for selected Text
- Add templates `{\n}`, `{newline}`, `{nl}` for new line
- Add shorter template `{clip}` for clipboard
- Add `Default Content` and `Fill Form with Default Values` settings for `Create Note` command
- Add `Show in Finder` action for all vault selection lists
- Minor fixes

## [Edit Note Action, Clipboard Template | Version 1.6.1] - 2022-07-01

- Add `Edit Note` action to `Search Note` and `Pinned Notes` command which lets you edit a note
- `Edit Note` action supports templates
- Add `Reset Pinned Notes` action for `Pinned Notes` command
- Add `Delete Note` action to `Search Note` and `Pinned Notes` command which lets you delete a note
- Add `{clipboard}` to available templates
- Update store images
- Migrate to Raycast API v1.37.0
- Minor fixes

## [Full Content Search, Metadata View, Templates & More| Version 1.6.0] - 2022-06-20

- Add full content search to `Search Note` and `Pinned Notes` command
- Add metadata view for notes in `Search Note` and `Pinned Notes` command
- Add templates for `Create Note` command that can be used in the notes name and content
- Add `Show in Finder` action to `Search Note`, `Pinned Notes` and `Open Vault` commands
- Vaults will now be found automatically
- Fix performance issues
- Migrate to Raycast API v1.36.0

## [New command, Detail View & More | Version 1.5.0] - 2022-05-02

- Add `Pinned Notes` command which lists all pinned notes of a vault
- Add `Pin Note` action to `Search Note` command which pins a note
- Add `Unpin Note` action to `Search Note` command which unpins a note
- Add detail view for notes in `Search Note` and `Pinned Notes` command
- Add option to hide LaTeX in Quick Look and detail view
- Add customizable folder actions for `Create Note` command (quickly create a note in a folder)
- Add option to open note on creation for `Create Note` command
- Add option to specify default name for notes without name for `Create Note` command
- Commands with only one vault will now trigger directly without prior selection
- Minor fixes

## [New command & Action for Search Command] - 2022-04-01

- Add `Daily Note` command, opens or creates new daily note
- Add `Append Selected Text to Note` action for search command
- Restructure entire codebase

## [Minor Fixes] - 2022-02-10

- Fix a bug that could cause crashes on new installs
- Add better error handeling
- Corrected typo in settings

## [New Command & Actions for Search Command] - 2022-01-18

- Add `Create Note` command, lets you create new notes
- Add `Copy Obsidian URI` action for `Search Note` command
- Add `Copy Obsidian markdown link` action for `Search Note` command
- Vault path is now a general extension setting
- Minor fixes

## [New Command & Primary Action] - 2022-01-04

- Add `Open Vault` command, lets you switch quickly between different vaults
- Add option to select a primary action for `Search Note` command
- Several fixes for faster search times

## [Add Obsidian] - 2021-12-11

Initial version
