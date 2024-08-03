# Quick Notes

Create simple markdown notes in Raycast stored locally. No integrations required!

### Features

- View, create, and delete markdown notes
- Draft and auto-save if you accidentally exit out while creating/editing a new note
- Quick toggle tags for a note
- View note metadata & tags
- Emoji Support everywhere using `:` 😁
- Export notes to a folder to use in another application
- Setup auto-save to a folder of your choice, set in preferences
- Tag manager
- Summarize note using AI (Raycast Pro)

If you’d like, you can export or auto-sync your notes as markdown to a directory to use in a 3rd-party app like Obisidian, VS Code, or Notion. This is completely optional though and notes will still save locally.

### Commands

**View Notes**

- View and edit your notes
- `⌘ + N` - Create a new note
- `⌘ + ⇧ + C` - Copy note body
- `^ + ⇧ + X` - Delete a note
- `⌘ + T` - Quick apply / remove tag
- `⌘ + ⇧ + T` - Create a new tag
- `⌘ + F` - Filter by tag
- `^ + ⇧ + T` - Delete tags
- `⌘ + M` - Toggle note metadata
- `⌘ + S` - Sort notes
- `⌘ + I` - Summarize note with AI
- `⌘ + ⇧ + I` - Clear AI summary

**Export Notes (1-way sync)**

- Set a directory to export your notes once
- Setting a folder in extension settings automates this

**Sync with Folder (2-way automatic sync)**

- Disabled by default
- Set up automatic 2-way sync by adding a folder in settings
  - Adding `.md` markdown files to your folder will sync back to Quick Notes
- Auto-runs every 10min (background sync can be turned off)
