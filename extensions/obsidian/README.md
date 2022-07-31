<p align="center">
<img width=180 src="https://user-images.githubusercontent.com/67844154/164725204-544131bd-60e4-4666-8541-6587f20d7e42.png">
</p>

# Obsidian for Raycast

This is a raycast extension with commands for the note taking and knowledge management app Obsidian. To use it, install the extension from the [Raycast Store](https://www.raycast.com/marcjulian/obsidian), open Raycast Search and type one of the following commands.

## Overview

- [Search Note](https://github.com/marcjulianschwarz/obsidian-raycast#search-note)
  - [Actions for Search Note Command](https://github.com/marcjulianschwarz/obsidian-raycast#actions-for-search-note-command)
  - [Quick Look Action](https://github.com/marcjulianschwarz/obsidian-raycast#quick-look-action)
- [Search Media](https://github.com/marcjulianschwarz/obsidian-raycast#search-media)
  - [Actions for Search Media Command](https://github.com/marcjulianschwarz/obsidian-raycast#actions-for-search-media-command)
- [Random Notes](https://github.com/marcjulianschwarz/obsidian-raycast#random-note)
- [Open Vault](https://github.com/marcjulianschwarz/obsidian-raycast#open-vault)
- [Create Note](https://github.com/marcjulianschwarz/obsidian-raycast#create-note)
- [Daily Note](https://github.com/marcjulianschwarz/obsidian-raycast#daily-note)
- [Pinned Note](https://github.com/marcjulianschwarz/obsidian-raycast#pinned-notes)
- [Obsidian Menu Bar Item](https://github.com/marcjulianschwarz/obsidian-raycast#obsidian-menu-bar-item)

## Search Note

This command allows for quick access to all of your notes. By default you can search notes by title. Enabeling content search in the commands preferences allows you to search for notes by their content and title.
Use the tag filter in the top right corner to filter notes based on their tags (both YAML frontmatter and inline tags).

Enabeling `Show Detail` and `Show Metadata` in the extensions preferences will show a sidebar view with the following information:

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
- `opt + v` will paste the notes content to the app you used before raycast
- `opt + l` will copy a markdown link for the note to your clipboard
- `opt + u` will copy the obsidian URI for the note to your clipboard (see: [Obsidian URI](https://help.obsidian.md/Advanced+topics/Using+obsidian+URI))
- `opt + p` will pin an unpinned note
- `opt + p` will unpin a pinned note

The primary action (`enter`) can be changed in the extensions preferences.

<img width="1000" alt="Search Note Command actions" src="https://user-images.githubusercontent.com/67844154/178247612-315091e4-aeec-4944-880c-d4106c493dee.png">
<img width="1000" alt="Search Note Command actions" src="https://user-images.githubusercontent.com/67844154/178247714-0d0b48a4-ae43-4a08-8e63-246634a8d421.png">

### Quick Look Action

The Quick Look actions will open your note in Raycast itself. From here you can read the note or perform additional actions in the action bar (`cmd + k`).

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
- `{day}`
- `{hour}`
- `{minute}`
- `{second}`
- `{millisecond}`
- `{timestamp}`, `{zettelkastenID}`
- `{clipboard}`, `{clip}`
- `{\n}`, `{nl}`, `{newline}`

<img width="1000" alt="Create Note Command" src="https://user-images.githubusercontent.com/67844154/178248345-bb1718d9-1c29-44b1-b50b-87286e121003.png">

## Daily Note

This command will open the daily note from the selected vault. If a daily note doesn't exist it will create one and open it.
It requires the community plugin [Advanced Obsidian URI](https://obsidian.md/plugins?id=obsidian-advanced-uri) and the core plugin "Daily notes" to be installed and enabled.

## Pinned Notes

This command will open a list of your pinned notes. All actions and preferences from the `Search Note` command are available.

Additional actions:

- `opt + r` will reset all pinned notes for the selected vault

<img width="1000" alt="Pinned Notes Command" src="https://user-images.githubusercontent.com/67844154/178248422-2668fad8-8936-490b-8cf1-1dea0793712a.png">

## Obsidian Menu Bar Item

Use this command to add a menu bar item to the top of the screen (Obsidian icon).
Clicking it will reveal a list of your vaults. You can view your pinned notes, perform actions on them or open a daily note.

<img width="635" alt="Obsidian Menu Bar Item" src="https://user-images.githubusercontent.com/67844154/180802502-3c6243ae-e3f9-4ddc-95ba-f205dab46721.png">

## Preferences

### General settings

- set path/paths to your preferred vault/vaults (comma separated).
  By default, vaults will be detected from `~/Library/Application Support/obsidian/obsidian.json`, which contains all vaults that have been opened with Obsidian before.

### Search Note

- exclude folders, files and paths so they dont show up in the search
- hide YAML frontmatter in "Quick Look" and copy/paste
- hide wikilinks in "Quick Look" and copy/paste
- hide LaTeX in "Quick Look" and copy/paste
- templates for append actions
- show note content in detail view
- show metadata about note in detail view
- enable content search
- select primary action (for `enter`)

### Create Note

- default path where a new note will be created
- default tag (will be selected by default in the tag picker)
- list of tags to be suggested in the tag picker (comma separated)
- open note on creation
- default note name (if note name is empty)
- default note content
- fill form with default values
- list of folders that will create actions for creating notes inside of the specified folders

### Pinned Notes

- hide YAML frontmatter in "Quick Look" and copy/paste
- hide wikilinks in "Quick Look" and copy/paste
- hide LaTeX in "Quick Look" and copy/paste
- templates for append actions
- show note content in detail view
- show metadata about note in detail view
- enable content search
- select primary action (for `enter`)

### Random Note

- exclude folders, files and paths so notes from them won't show up
- hide YAML frontmatter in "Quick Look" and copy/paste
- hide wikilinks in "Quick Look" and copy/paste
- hide LaTeX in "Quick Look" and copy/paste
- templates for append actions
- select primary action (for `enter`)

### Search Media

- exclude folders, files and paths so they don't show up in the search
- select image size (small, medium, large)

## Blog posts:

- [First Update Raycast Obsidian Extension](https://www.marc-julian.de/2022/03/Obsidian%20Raycast%20Extension%20Update.html)
- [Obsidian Raycast Extension](https://www.marc-julian.de/2022/01/raycastobsidian.html)

## Contributions and Credits

Thank you [macedotavares](https://forum.obsidian.md/t/big-sur-icon/8121?u=marcjulian) for letting me use your amazing Obsidian (Big Sur) icon.
