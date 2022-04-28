# Obsidian for Raycast
This is a raycast extension with commands for the note taking and knowledge management app Obsidian. To use it, simply open Raycast Search and type one of the following commands:

## Search Note
This command allows for quick access to all of your notes.
It features several actions which you can trigger with these keyboard shortcuts: 
- `enter` will open the note in "Quick Look"
- `cmd + enter` will open the note in Obsidian
- `opt + a` will let you append text to the note
- `opt + s` will append selected text to the note
- `opt + c` will copy the notes content to your clipboard
- `opt + v` will paste the notes content to the app you used before raycast
- `opt + l` will copy a markdown link for the note to your clipboard
- `opt + u` will copy the obsidian URI for the note to your clipboard (see: [Obsidian URI](https://help.obsidian.md/Advanced+topics/Using+obsidian+URI))

The primary action (`enter`) can be changed in the extensions preferences.

![Search Note Command](https://user-images.githubusercontent.com/67844154/161255751-8a460ca1-c38f-4133-adaa-909f7a450ab1.png)



## Open Vault
This command will show a list of previously specified vaults which you can open by pressing `enter`.

![Open Vault Command](https://user-images.githubusercontent.com/67844154/161255791-66445ad2-0e27-4c5b-b751-a8a404d18c15.png)



## Create Note
This command lets you create new notes on the fly by entering a name, optionally a path to a subfolder in your vault and some content. You can use the tag picker to add tags to the notes YAML frontmatter.

![Create Note Command](https://user-images.githubusercontent.com/67844154/161255831-b21fd820-68b8-4829-a654-b470646ba67b.png)


## Daily Note
This command will open the daily note from the selected vault. If a daily note doesn't exist it will create one and open it.
It requires the community plugin [Advanced Obsidian URI](https://obsidian.md/plugins?id=obsidian-advanced-uri) and the core plugin "Daily notes" to be installed and enabled.

## Preferences
### General settings
- set path/paths to your vault/vaults (comma separated)
### Search Note
- exclude folders, files and paths so they dont show up in the search
- hide YAML frontmatter in "Quick Look" and copy/paste
- hide wikilinks in "Quick Look" and copy/paste
- select primary action (for `enter`)
### Create Note
- default path where a new note will be created
- default tag (will be selected by default in the tag picker)
- list of tags to be suggested in the tag picker (comma separated)

## Blog posts:
- [First Update Raycast Obsidian Extension](https://www.marc-julian.de/2022/03/Obsidian%20Raycast%20Extension%20Update.html)
- [Obsidian Raycast Extension](https://www.marc-julian.de/2022/01/raycastobsidian.html)

## Contributions and Credits
Thank you [macedotavares](https://forum.obsidian.md/t/big-sur-icon/8121?u=marcjulian) for letting me use your amazing Obsidian (Big Sur) icon.
