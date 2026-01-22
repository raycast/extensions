# Logos Notes Sync

Sync notes and highlights from Logos Bible Software to your Obsidian vault.

## Features

- **Sync Notes**: Export all your notes and highlights from Logos to Obsidian markdown files
- **Browse Notes**: Search and browse your notes directly in Raycast
- **Deep Links**: Each note includes a link to open the source in Logos
- **Organized by Resource**: Notes are grouped by book/resource with YAML frontmatter

## Setup

### 1. Configure Extension Preferences

Open Raycast Settings → Extensions → Logos Notes Sync and set:

- **Obsidian Vault Path**: Path to your Logos notes folder (e.g., `~/My Vault/Logos`)
- **Excluded Resources**: Comma-separated resource IDs to skip (e.g., `LLS:ESV,LLS:NIV`)
- **Include Highlight Color**: Show highlight colors like `[yellow]` in notes

### 2. Login to Faithlife

Run the "Login to Faithlife" command and follow the instructions to authenticate.

**Note**: Due to Logos using OAuth 1.0a with a private consumer secret, you'll need to:
1. Login to https://app.logos.com in your browser
2. Extract your session token from browser DevTools
3. Paste it into the login form

### 3. Sync Your Notes

Run "Sync Notes" to export all your highlights and notes to Obsidian.

## Output Format

Each resource gets its own markdown file with:

```markdown
---
title: Book Title
logos_resource_id: LLS:XXXXX
logos_link: logos4:ResourceRef;ResourceId=LLS:XXXXX
synced: 2024-01-22
note_count: 42
tags:
  - Logos
---

# Book Title

- [yellow] Highlighted text content here
  *Matthew 5:1 | [Open in Logos](logos4:ResourceRef;ResourceId=LLS:XXXXX)*

- Another note without highlight color
  *Page 123 | [Open in Logos](logos4:ResourceRef;ResourceId=LLS:XXXXX)*
```

## Commands

| Command | Description |
|---------|-------------|
| Sync Notes | Export all notes to Obsidian |
| Browse Notes | Search and view notes in Raycast |
| Login to Faithlife | Authenticate with your account |

## Troubleshooting

### "Not authenticated" error
Re-run the Login command with a fresh session token.

### Notes not syncing
Make sure your Obsidian vault path is correct and the folder exists.

### Missing highlights
The sync includes all notes and highlights from your Logos account. If some are missing, try logging out and back in.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## License

MIT
