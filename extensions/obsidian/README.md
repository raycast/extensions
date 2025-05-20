<p align="center">
<img width=180 src="https://user-images.githubusercontent.com/67844154/164725204-544131bd-60e4-4666-8541-6587f20d7e42.png">
</p>

# Obsidian for Raycast

This is a raycast extension with commands for the note taking and knowledge management app [Obsidian]( https://obsidian.md/). To use it, install the extension from the [Raycast Store](https://www.raycast.com/KevinBatdorf/obsidian), open Raycast Search and type one of the following commands.

## Overview

- [Search Note](https://github.com/KevinBatdorf/obsidian-raycast#search-note)
  - [Actions for Search Note Command](https://github.com/KevinBatdorf/obsidian-raycast#actions-for-search-note-command)
  - [Quick Look Action](https://github.com/KevinBatdorf/obsidian-raycast#quick-look-action)
- [Search Media](https://github.com/KevinBatdorf/obsidian-raycast#search-media)
  - [Actions for Search Media Command](https://github.com/KevinBatdorf/obsidian-raycast#actions-for-search-media-command)
- [Random Notes](https://github.com/KevinBatdorf/obsidian-raycast#random-note)
- [Open Vault](https://github.com/KevinBatdorf/obsidian-raycast#open-vault)
- [Create Note](https://github.com/KevinBatdorf/obsidian-raycast#create-note)
- [Daily Note](https://github.com/KevinBatdorf/obsidian-raycast#daily-note)
- [Append to Daily Note](https://github.com/KevinBatdorf/obsidian-raycast#append-to-daily-note)
- [Bookmarked Note](https://github.com/KevinBatdorf/obsidian-raycast#bookmarked-notes)
- [Obsidian Menu Bar Item](https://github.com/KevinBatdorf/obsidian-raycast#obsidian-menu-bar-item)

## Search Note

This command allows for quick access to all of your notes. By default you can search notes by title. Enabling content search in the commands preferences allows you to search for notes by their content and title. If there doesn't exist a note with the title you searched for you can create a new note with that title right from the command.
Use the tag filter in the top right corner to filter notes based on their tags (both YAML frontmatter and inline tags).

Enabling `Show Detail` and `Show Metadata` in the extensions preferences will show a sidebar view with the following information:

- Note content
- Character Count
- Word Count
- Reading Time
- Creation Date
- File Size
- Note Path

<img width="1000" alt="Search Note Command" src="https://user-images.githubusercontent.com/67844154/178247431-2c8be700-7dca-469d-9c99-cd0fde565524.png">
<img width="1000" alt="Search Note Command Tag Filter" src="https://user-images.githubusercontent.com/67844154/178251441-eeb0c4f9-c848-4899-aa12-62aae9ba3094.png">

### Actions for Search Note command

It features several actions which you can trigger with these keyboard shortcuts (or search for them with `cmd + k`):

**Open Note Actions:**
Depending on the primary action set in preferences, the keyboard shortcuts can be different.

- `enter` will open the note in "Quick Look"
- `cmd + enter` will open the note in Obsidian
- `Open in new Pane` will open the note in a new pane in Obsidian (only for vaults with advanced-uri plugin)

**Other Actions:**

- `opt + enter` will open the notes path in Finder
- `opt + e` will let you edit the note (supports templates)
- `opt + d` will let you delete the note
- `opt + a` will let you append text to the note (supports templates)
- `opt + s` will append selected text to the note (supports templates)
- `opt + c` will copy the notes content to your clipboard
- `opt + t` will copy the notes title to your clipboard
- `opt + v` will paste the notes content to the app you used before raycast
- `opt + l` will copy a markdown link for the note to your clipboard
- `opt + u` will copy the obsidian URI for the note to your clipboard (see: [Obsidian URI](https://help.obsidian.md/Advanced+topics/Using+obsidian+URI))
- `opt + p` will bookmark a note
- `opt + p` will "unbookmark" a bookmarked note
- Reload Notes, will reload notes from the vault (useful if you have just created a new note)

The primary action (`enter`) can be changed in the extensions preferences.

<img width="1000" alt="Search Note Command actions" src="https://user-images.githubusercontent.com/67844154/178247612-315091e4-aeec-4944-880c-d4106c493dee.png">
<img width="1000" alt="Search Note Command actions" src="https://user-images.githubusercontent.com/67844154/178247714-0d0b48a4-ae43-4a08-8e63-246634a8d421.png">

### Quick Look Action

The Quick Look actions will open your note in Raycast itself.

<img width="1000" alt="obsidian-5" src="https://user-images.githubusercontent.com/67844154/178248667-6b90bd65-0861-41e4-b68c-256f30d89d1d.png">

## Search Media

This command allows for quick access to all of the media (images, video, audio and PDFs) in your vaults.
Use the type filter in the top right corner (`cmd + p`) to filter the media by its type / file extension.

### Actions for Search Media command

It features several actions which you can trigger with these keyboard shortcuts (or search for them with `cmd + k`):

- `enter` will open the file in Apples Preview app
- `cmd + enter` will open the file in Obsidian

<img width="1000" alt="obsidian-10" src="https://user-images.githubusercontent.com/67844154/180800668-08706bf6-4c17-4aca-b5fa-e4c420d04eb6.png">

## Random Note

This command will open a random note of a previously selected vault in Quick Look where all actions from the `Search Note` command are available.

## Open Vault

This command will show a list of all of your Obsidian vaults which you can open by pressing `enter`.
Actions that you can trigger with a keyboard shortcut:

- `cmd + enter` will open the vaults folder in the Finder app

## Create Note

This command lets you create new notes on the fly by entering a name, optionally a path to a subfolder in your vault and some content. You can use the tag picker to add tags to the notes YAML frontmatter.

Both the note name and note content support these templates:

- `{date}`
- `{time}`
- `{year}`
- `{month}`
- `{week}`
- `{day}`
- `{hour}`
- `{minute}`
- `{second}`
- `{millisecond}`
- `{timestamp}`, `{zettelkastenID}`
- `{clipboard}`, `{clip}`
- `{selection}`, `{selected}`
- `{\n}`, `{nl}`, `{newline}`

But also the table of tokens defined in the [luxon documentation](https://moment.github.io/luxon/#/formatting?id=table-of-tokens) (such as dd, MM, YYYY,...).

<img width="1000" alt="Create Note Command" src="https://user-images.githubusercontent.com/67844154/178248345-bb1718d9-1c29-44b1-b50b-87286e121003.png">

## Daily Note

This command will open the daily note from the selected vault. If a daily note doesn't exist it will create one and open it.
It requires the community plugin [Advanced Obsidian URI](https://obsidian.md/plugins?id=obsidian-advanced-uri) and the core plugin "Daily notes" to be installed and enabled.

## Append to Daily Note

This command will append text to the daily note from the selected vault. If a daily note doesn't exist it will create one and open it. To append as efficiently as possible, the text is provided as a parameter to the command, so there's no form to fill out.

It requires the community plugin [Advanced Obsidian URI](https://obsidian.md/plugins?id=obsidian-advanced-uri) and the core plugin "Daily notes" to be installed and enabled.

## Bookmarked Notes

This command will open a list of your bookmarked notes. All actions and preferences from the `Search Note` command are available. Bookmarking or unbookmarking a note will reflect in Obsidians Bookmarked notes. Bookmarking a note in Obsidian will also reflect in Raycast.

Additional actions:

- `opt + r` will reset all bookmarked notes for the selected vault

<img width="1000" alt="Bookmarked Notes Command" src="https://user-images.githubusercontent.com/67844154/178248422-2668fad8-8936-490b-8cf1-1dea0793712a.png">

## Obsidian Menu Bar Item

Use this command to add a menu bar item to the top of the screen (Obsidian icon).
Clicking it will reveal a list of your vaults. You can view your bookmarked notes, perform actions on them or open a daily note.

<img width="635" alt="Obsidian Menu Bar Item" src="https://user-images.githubusercontent.com/67844154/180802502-3c6243ae-e3f9-4ddc-95ba-f205dab46721.png">

## Preferences

### General settings

- set path/paths to your preferred vault/vaults (comma separated).
  By default, vaults will be detected from `~/Library/Application Support/obsidian/obsidian.json`, which contains all vaults that have been opened with Obsidian before.
- exclude folders, files and paths so they dont show up in the search (comma separated). Files and Folders that were excluded in Obsidian itself will also be excluded here.
- hide YAML frontmatter in "Quick Look" and copy/paste
- hide wikilinks in "Quick Look" and copy/paste
- hide LaTeX in "Quick Look" and copy/paste

### Search Note

- templates for append actions
- show note content in detail view
- show metadata about note in detail view
- enable content search
- select primary action (for `enter`)

### Create Note

- blank note, if enabled, will create a note without any content
- open note on creation
- default path where a new note will be created
- default tag (will be selected by default in the tag picker)
- list of tags to be suggested in the tag picker (comma separated)
- default note name (if note name is empty)
- default note content
- fill form with default values
- list of folders that will create actions for creating notes inside of the specified folders

### Append to Daily Note

- template for the appended text (e.g. could set to `- [ ] ` to create a checklist item)
- vault in which the Daily Note will be appended (if not set, you will be prompted to select a vault when the command is run)
- heading in which the appended text will be placed (if not set, the text will be appended to the end of the note)
- silent mode, if enabled, will not open the note if it is currently not opened in an Obsidian tab or pane (Obsidian has to be running)

### Bookmarked Notes

- templates for append actions
- show note content in detail view
- show metadata about note in detail view
- enable content search
- select primary action (for `enter`)

### Random Note

- templates for append actions
- select primary action (for `enter`)

### Search Media

- exclude folders, files and paths so they don't show up in the search
- select image size (small, medium, large)

## Previous Developer / Maintainer

This extension was originally developed by [Marc Julian Schwarz](https://marc-julian.de/). As of 15th May 2023, Marc Julian is no longer maintaining this extension due to time constraints related to his university studies. This extension will now be further developed and maintained by [Kevin Batdorf](https://github.com/KevinBatdorf/). "Thank you for taking over this extension and keeping it alive for the community." -Marc Julian

## Blog posts:

- [First Update Raycast Obsidian Extension](https://www.marc-julian.de/2022/03/Obsidian%20Raycast%20Extension%20Update.html)
- [Obsidian Raycast Extension](https://www.marc-julian.de/2022/01/raycastobsidian.html)

## Disclaimer

This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Obsidian. The official Obsidian website can be found at https://obsidian.md. "Obsidian" as well as related names, marks, emblems and images are registered trademarks of their respective owners.
