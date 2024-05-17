# Quick Notes

Create simple markdown notes in Raycast stored locally. No integrations required!

### Features

- View, create, and delete markdown notes
- Search by note title, body, or tag
- Draft and auto-save if you accidentally exit out while creating/editing a new note
- Export notes to a folder to use in another application
- Setup auto-save to a folder of your choice, set in preferences
- Emoji Support everywhere using `:` 😁
- Tag manager

If you’d like, you can export or auto-sync your notes as markdown to a directory to use in a 3rd-party app like Obisidian, VS Code, or Notion. This is completely optional though and notes will still save locally.

### Commands

**View Notes**

- View and edit your notes
- Create a new note `⌘ + N`
- Copy note body `⌘ + ⇧ + C`
- Delete a note `^ + ⇧ + X`
- Filter by tag `⌘ + T`
- Create a new tag `⇧ + ⌘ + T`
- Delete tags `^ + ⇧ + T`

**Export Notes (1-way sync)**

- Set a directory to export your notes once
- Setting a folder in extension settings automates this

**Sync with Folder (2-way automatic sync)**

- Disabled by default
- Set up automatic 2-way sync by adding a folder in settings
  - Adding `.md` markdown files to your folder will sync back to Quick Notes
- Auto-runs every 10min (background sync can be turned off)
