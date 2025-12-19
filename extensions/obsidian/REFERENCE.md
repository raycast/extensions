# Reference

This is a reference page for all features of the extension. You can use this reference to manually check whether features are working the way they are intended to do.

Last time verified all: 2025-12-11 (macOS)

## General Preferences

- [ ] Path to Vault
  - [ ] manually set the path to a vaulte here to override the automatic Obsidian vault detection
- [ ] Config filename
  - [ ] default to .obsidian
  - [ ] set a config filename if the .obsidian folder got renamed
- [ ] Excluded folders
  - [ ] comma separated list of folders that will be excluded everywhere
- [ ] Remove content
  - [ ] hide YAML frontmatter (Obsidian properties)
  - [ ] hide LaTeX (block and inline)
  - [ ] hide wiki links ([[some link]] -> some link)

## Vault Selection

Nearly every command has a vault selection that either moves to the next "action/page" directly when there is only one vault in Obsidian or shows a selection when there are multiple vaults.

## Notes List

Many commands use a note list.

### Quick Look

- [ ] actions
  - [ ] Open in Obsidian
  - [ ] Open in new Obsidian tab
  - [ ] Show in Finder
  - [ ] Bookmark note
  - [ ] Unbookmark note
  - [ ] Copy Code
    - [ ] if only one code block in the note -> copies code
    - [ ] if multiple code blocks in the note -> shows code blocks in a list with language information -> paste or copy now
  - [ ] Copy Note Content
  - [ ] Copy Note Title
  - [ ] Paste Note Content
  - [ ] Copy Markdown Link
  - [ ] Copy Obsidian Link
  - [ ] Edit note
    - [ ] needs user confirmation for edit to apply
    - [ ] i think applies templates as well -> see templates
  - [ ] Appending
    - [ ] Append to note (text via form, I think templates apply here)
    - [ ] Append selected text to note
    - [ ] Append task to note
  - [ ] Delete Note

### Preferences

- [ ] template for append action
  - [ ] see templates
- [ ] template for append selected text action
  - [ ] see templates
- [ ] "Show Detail" option -> shows note content on the right side of the list
- [ ] "Show Metadata" option
  - [ ] Character Count
  - [ ] Word Count
  - [ ] Reading Time
  - [ ] Creation Date
  - [ ] File Size
  - [ ] Note Path (relative to vault root)
  - [ ] Link to Websit (extracted from "url" property field if available)
- [ ] "Search Content" option -> should the note content be used for the search (additional to title)
- [ ] "Use Fuzzy Search" option -> typos and different spellings can still find relevant notes
- [ ] Primary Action -> what action should be performed when pressing Enter on a note
  - [ ] Quick Look (see Quick Look)
  - [ ] Open in Obsidian
  - [ ] Open in new Obsidian tab
  - [ ] Open in default app (for markdown files)

## Search Arguments

- [ ] note -> prefills search bar with this argument
- [ ] tag -> prefills tags dropdown with this argument

## Open Vault Command

- [ ] see vault selection
- [ ] actions
  - [ ] Open Vault
  - [ ] Show in Finder

## Random Note Command

- [ ] see vault selection
- [ ] actions
  - [ ] Select Vault -> opens random note
  - [ ] Show in Finder -> shows vault in finder

## Daily Note Command

- [ ] see vault selection
- [ ] shows subset of vaults that have both:
  - [ ] advanced URI community plugin installed
  - [ ] daily notes core plugin enabled
- [ ] opens the daily note or creates the daily note if it does not exist yet
- [ ] preferences
  - [ ] default vault -> skips vault selection

## Append To Daily Note Command

- [ ] see vault selection
- [ ] appends the given argument to the daily note
- [ ] preferences:
  - [ ] default vault -> skips vault selection
  - [ ] template
  - [ ] name of heading -> append content below that heading
  - [ ] prepend option -> prepends instead of appends text if enabled
  - [ ] silent mode -> does not switch between notes in Obsidian if enabled

## Append Task Command

- [ ] see vault selection
- [ ] shows subset of vaults that have:
  - [ ] Advanced URI plugin installed
- [ ] appends tasks to list in a specific note
- [ ] arguments
  - [ ] task name
  - [ ] task date in ISO format YYYY-MM-DD
- [ ] preferences
  - [ ] path to task note
  - [ ] task tag
  - [ ] option to add creation date to task
  - [ ] default vault -> skips vault selection
  - [ ] name of heading -> append content below that heading
  - [ ] silent mode -> does not switch between notes in Obsidian if enabled

## Bookmarked Notes

- [ ] see vault selection
- [ ] see note list
- [ ] shows only bookmarked notes
- [ ] unbookmarking a note removes the bookmark icon

## Create Note Command

- [ ] see vault selection
- [ ] creates a new note in the selected vault based on the provided details and preferences
- [ ] name
  - [ ] no name provided -> create note with name "Untitled" (default preference)
  - [ ] name already exists -> confirm to override note
  - [ ] see templates
- [ ] path
  - [ ] path exists -> write note to path
  - [ ] path does not exist -> create entire path and write note to path
- [ ] tags
  - [ ] select tags that are specified in the preferences
- [ ] content
  - [ ] if empty -> create empty notes
  - [ ] see templates
- [ ] preferences
  - [ ] blank note option -> skips form and directly creates empty note
  - [ ] open note on creation option (blank notes will always open Obsidian)
  - [ ] default path value
  - [ ] default name value
    - [ ] see templates
  - [ ] default content value
    - [ ] see templates
  - [ ] fill form with default options
    - [ ] puts the default values into the form without evaluating templates yet
  - [ ] default tag
    - [ ] is added to notes where no tag is selected
  - [ ] tags
    - [ ] comma separated list of tags that are shown in the command
  - [ ] folder actions
    - [ ] comma separated list of folders that get added as raycast actions in the command
    - [ ] use the actions or shift+cmd+index to create the note directly in that folder

## Search Note Command

- [ ] see vault selection
- [ ] see note list
- [ ] see search arguments

## Search Media

- [ ] see vault selection
- [ ] shows all media in a grid view
- [ ] actions
  - [ ] open in macOS quick look
  - [ ] open in Obsidian
  - [ ] show in finder
- [ ] preferences
  - [ ] excluded folders
    - [ ] media from those folders should not appear
  - [ ] image size -> media preview size in the grid view
    - [ ] small
    - [ ] medium
    - [ ] large

## Obsidian Menubar

- [ ] shows in menubar when enabled
- [ ] opens daily note via vault selection of subset of vaults
- [ ] shows bookmarked notes via vault selection of subset of vaults
