<p align="center">
<img width=180 src="https://user-images.githubusercontent.com/67844154/164725204-544131bd-60e4-4666-8541-6587f20d7e42.png">
</p>

# Obsidian for Raycast

This is a raycast extension with commands for the note taking and knowledge management app Obsidian. To use it, install the extension from the [Raycast Store](https://www.raycast.com/marcjulian/obsidian), open Raycast Search and type one of the following commands:

## Search Note

This command allows for quick access to all of your notes. By default you can search notes by title. Enabeling content search in the commands preferences allows you to search for notes by their content and title.

It features several actions which you can trigger with these keyboard shortcuts:

- `enter` will open the note in "Quick Look"
- `cmd + enter` will open the note in Obsidian
- `opt + enter` will open the notes path in Finder
- `opt + e` will let you edit the note (supports templates)
- `opt + d` will let you delete the note
- `opt + a` will let you append text to the note (supports templates)
- `opt + s` will append selected text to the note
- `opt + c` will copy the notes content to your clipboard
- `opt + v` will paste the notes content to the app you used before raycast
- `opt + l` will copy a markdown link for the note to your clipboard
- `opt + u` will copy the obsidian URI for the note to your clipboard (see: [Obsidian URI](https://help.obsidian.md/Advanced+topics/Using+obsidian+URI))
- `opt + p` will pin an unpinned note
- `opt + p` will unpin a pinned note

The primary action (`enter`) can be changed in the extensions preferences.

![Search Note Command](https://user-images.githubusercontent.com/67844154/161255751-8a460ca1-c38f-4133-adaa-909f7a450ab1.png)

Enabeling `Show Detail` and `Show Metadata` in the extensions preferences will show a sidebar view with the following information:

- Note content
- Character Count
- Word Count
- Reading Time
- Creation Date
- File Size
- Note Path

## Open Vault

This command will show a list of all of your Obsidian vaults which you can open by pressing `enter`.

Actions that you can trigger with a keyboard shortcut:

- `cmd + enter` will open the vaults folder in the Finder app

![Open Vault Command](https://user-images.githubusercontent.com/67844154/161255791-66445ad2-0e27-4c5b-b751-a8a404d18c15.png)

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
- `{clipboard}`

![Create Note Command](https://user-images.githubusercontent.com/67844154/161255831-b21fd820-68b8-4829-a654-b470646ba67b.png)

## Daily Note

This command will open the daily note from the selected vault. If a daily note doesn't exist it will create one and open it.
It requires the community plugin [Advanced Obsidian URI](https://obsidian.md/plugins?id=obsidian-advanced-uri) and the core plugin "Daily notes" to be installed and enabled.

## Pinned Notes

This command will open a list of your pinned notes. All actions and preferences from the `Search Note` command are available.

Actions:

- `opt + r` will reset all pinned notes for the selected vault

![Pinned Notes Command](https://user-images.githubusercontent.com/67844154/166225022-4025e675-0e3d-430d-9fda-d4672afd4df1.png)

## Preferences

### General settings

- set path/paths to your preferred vault/vaults (comma separated).
  By default, vaults will be detected from `~/Library/Application Support/obsidian/obsidian.json`, which contains all vaults that have been opened with Obsidian before.

### Search Note

- exclude folders, files and paths so they dont show up in the search
- hide YAML frontmatter in "Quick Look" and copy/paste
- hide wikilinks in "Quick Look" and copy/paste
- hide LaTeX in "Quick Look" and copy/paste
- prefix for append action
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
- list of folders that will create actions for creating notes inside of the specified folders

### Pinned Notes

- hide YAML frontmatter in "Quick Look" and copy/paste
- hide wikilinks in "Quick Look" and copy/paste
- hide LaTeX in "Quick Look" and copy/paste
- prefix for append action
- show note content in detail view
- show metadata about note in detail view
- enable content search
- select primary action (for `enter`)

## Blog posts:

- [First Update Raycast Obsidian Extension](https://www.marc-julian.de/2022/03/Obsidian%20Raycast%20Extension%20Update.html)
- [Obsidian Raycast Extension](https://www.marc-julian.de/2022/01/raycastobsidian.html)

## Contributions and Credits

Thank you [macedotavares](https://forum.obsidian.md/t/big-sur-icon/8121?u=marcjulian) for letting me use your amazing Obsidian (Big Sur) icon.
