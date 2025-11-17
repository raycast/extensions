# Obsidian Changelog

## [Bug fixes] - 2025-06-10

- Fixes a bug, which create a tagged note a wrong way. Changes an order of properties block and note text

## [Chore: Fixing typos in the README] - 2025-05-14

## [Spring Cleaning] - 2025-04-05

- Closes Raycast after creating a note with the Create Note command
- Adds `{selection}` and `{selected}` templates to Create Note command which both get replaced by the currently selected text
- Fixes bug where a tag dropdown selection would reset after the Quick Look action
- Fixes bug where Obsidian bookmark groups would get overriden by the extension
- Change extension author

## [Prepend to Daily Note] - 2025-02-01

- Adds prepend option to Append to Daily Note

## [Bug fixes] - 2025-01-28

- Fixes locale bug on Append Task command
- Fixes issue where tags were being converted to lowercase

## [Task Creation Date] - 2024-12-03

- Tasks added now log the creation date.

## [Support for Fuzzy Search] - 2024-09-05

- Add option to use Fuzzy Search on notes search. Disabled by default in note search config.

## [Bugfix for nested bookmarks] - 2024-02-06

- Fixes a bug where nested bookmarks would not be displayed correctly in search

## [Support luxon formats in templates] - 2024-01-30

- Support luxon date and time format (e.g. dd, MM, YYYY,...) in templates

## [Fix Search Media HotKey bug] - 2024-01-26

- Checks for defined `searchArgument` in MediaGrid value before filtering

## [Copy Note Title action] - 2024-01-17

- Add `Copy Note Title` action

## [Bugfixes and cache behavior tweak] - 2023-11-19

- Will now skip the cache if the value is an empty array
- Fixes a bug where no default application crashes the extension
- Fixes a bug where deleting the vault config path can't find the notes

## [New features and bugfixes] - 2023-10-12

- Adds extension setting to open note in default application
- Adds quick actions to the Random Note command
- Adds support for using {content} in templates
- Adds config file name option to override `.obsidian` config file name

## [Update search starting sort] - 2023-10-12

- Search now shows the most recent notes first

## [Fix] - 2023-09-24

- Filter out vault paths that don't actually exist.

## [Menubar cache bug fixes] - 2023-09-15

- Fixes a bug where the cache fallback would crash the extension

## [Apply templates on task file name] - 2023-08-5

- The Append Task command will now apply template placeholders to file name for dynamic file names

## [Bug fixes] - 2023-07-20

- Fixes and issue where tags as objects would crash the plugin

## [Add week placeholder] - 2023-07-14

- Adds a {week} template placeholder (thanks @adamadamsmusic)

## [Fix] - 2023-06-19

- Fixed menubar icon for light backgrounds

## [Updated icons] - 2023-06-15

- Update extension icons to match the new [logo and brand guidelines](https://obsidian.md/brand)

## [Append Tasks and Update Bookmarks] - 2023-06-012

- Update Starred notes to Bookmarks
- Add `Append Task` command (thanks @mikejongbloet)

## [Several Quality of Life Improvements] - 2023-02-05

- Add `Silent Mode` preference for the `Append to Daily Note Command` which prevents the command from opening the daily note
- Unified several preferences to make them more consistent
- Automatically exclude files and folders from search that are excluded in Obsidian
- Add `Blank Note` preference to `Create Note` command which lets you create a blank note immediately
- Add `Create Note` action to `Search Note` command which lets you create a new note from the search results if it doesn't exist yet
- Remove `Pinned Notes` command
- Add `Starred Notes` command which lists all starred notes of a vault
- Update Raycast API to v1.47.0
- Rewrote parts of the codebase to improve maintainability

## [Fix] - 2022-11-29

- Fixed a bug where command executed with shortcut was not working

## [Append to Daily Note Command] - 2022-11-23

- Add `Append to Daily Note Command` which can append text to a daily note. Text can be appended to the end of the note or to a specific heading. It supports all templates. Contributed by @iancanderson.
- Fixed dropdown menu preventing search to function in newer Raycast versions
- Update to Raycast API v1.44.0

## [Fix] - 2022-11-18

- Fixed a bug where the searchbar text didn't update

## [Small fix] - 2022-10-28

- Fix command execution with shortcut not working

## [Copy Code Action, Show Mentioning Notes Action, Tag List, Open URL & More] - 2022-09-14

- Add `Copy Code` action which either copies a code cell to the clipboard or opens a list to select one of the code cells
- Add `Paste Code` action which directly pastes code cells
- Add `Show Mentioning Notes` action which shows all notes that mention the selected note
- Add tag list to metadata view
- Add an `Open URL` entry to metadata view which opens the url specified in the notes YAML frontmatter for `url`
- You can now search for mentioning notes in `Search Media` command to find media that has been mentioned in the query note
- Minor fixes

## [Search Media Command, Menu Bar Item, Command Arguments, Custom Icons & More] - 2022-08-15

- Add `Search Media` command which lets you search for media like images, video, audio or pdfs in your vault
- Add `Image Size` preference for `Search Media` command
- Add file type filter (`cmd + p`) for `Search Media` command
- Add `Quick Look` and `Open in Obsidian` actions for `Search Media` command
- Add Menu Bar Item that lets you interact with your pinned notes or open a daily note
- Add Command Arguments for `Search Note`, `Search Media` and `Pinned Notes` command for quicker searches
- Add `Open in new Pane` action if advanced-uri plugin is installed for Obsidian
- Add a custom Obsidian icon for `Open in Obsidian` actions and the new Menu Bar Item
- Improve overall performance by caching the vaults content
- If full content search is activated in preferences you can now search for paths
- Minor fixes

## [Tag Filter, Markdown Controls for Edit Note, Templates for Append Action & More] - 2022-07-11

- Add tag filter to filter results in `Search Note` and `Pinned Notes` command by tags (YAML frontmatter and inline)
- Add `Random Note` command which opens a random note in Quick Look (all actions available)
- `Edit Note` action now supports markdown controls (e.g. `cmd + b` for bold and `cmd + i` for italic)
- `Append to Note` and `Append Selected Text to Note` actions now support all templates
- Add template preference for both `Append to Note` and `Append Selected Text to Note` actions
- Use `{content}` for `Append Selected Text to Note` action
- Add templates `{\n}`, `{newline}`, `{nl}` for new line
- Add shorter template `{clip}` for clipboard
- Add `Default Content` and `Fill Form with Default Values` settings for `Create Note` command
- Add `Show in Finder` action for all vault selection lists
- Minor fixes

## [Edit Note Action, Clipboard Template] - 2022-07-01

- Add `Edit Note` action to `Search Note` and `Pinned Notes` command which lets you edit a note
- `Edit Note` action supports templates
- Add `Reset Pinned Notes` action for `Pinned Notes` command
- Add `Delete Note` action to `Search Note` and `Pinned Notes` command which lets you delete a note
- Add `{clipboard}` to available templates
- Update store images
- Migrate to Raycast API v1.37.0
- Minor fixes

## [Full Content Search, Metadata View, Templates & More] - 2022-06-20

- Add full content search to `Search Note` and `Pinned Notes` command
- Add metadata view for notes in `Search Note` and `Pinned Notes` command
- Add templates for `Create Note` command that can be used in the notes name and content
- Add `Show in Finder` action to `Search Note`, `Pinned Notes` and `Open Vault` commands
- Vaults will now be found automatically
- Fix performance issues
- Migrate to Raycast API v1.36.0

## [New command, Detail View & More] - 2022-05-02

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
