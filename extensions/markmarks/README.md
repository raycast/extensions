# MarkMarks

A Raycast extension that uses a markdown file as the persistence layer for your bookmarks. Organize your bookmarks with hierarchical groups using markdown headings.

## Features

- **Bookmarks** - Browse all your bookmarks organized by groups with website favicons
- **New Bookmark** - Save the active tab from Safari, Chrome, Arc, or Dia
- **Edit & Delete** - Modify or remove bookmarks directly from Raycast
- **Move Between Groups** - Reorganize bookmarks by moving them to different groups
- **Search** - Quick search across all bookmarks by title, URL, or description
- **Hierarchical Groups** - Use markdown headings (h1-h6) to create nested groups

## Markdown File Format

The extension reads and writes bookmarks in a simple markdown format:

```markdown
# Work

- [GitHub](https://github.com) - Code hosting platform
- [Linear](https://linear.app) - Issue tracking

## Frontend

- [React Docs](https://react.dev) - React documentation

# Personal

- [YouTube](https://youtube.com) - Video streaming
```

### Format Rules

- **Groups** are defined using markdown headings (`#` to `######`)
- **Bookmarks** are markdown links in list format: `- [Title](url) - description`
- **Descriptions** are optional, separated by ` - ` after the URL
- **Nesting** is determined by heading levels (h2 under h1, h3 under h2, etc.)

## Configuration

Set the path to your markdown bookmarks file in the extension preferences:

1. Open Raycast Preferences
2. Navigate to Extensions → MarkMarks
3. Set the "Bookmarks File" to your desired markdown file path

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open bookmark | Enter |
| Copy URL | ⌘C |
| Copy title | ⌘⇧C |
| Edit bookmark | ⌘E |
| Move to group | ⌘M |
| Delete bookmark | ⌘⌫ |
| Reload bookmarks | ⌘R |
| Open bookmarks file | ⌘⇧O |

## Supported Browsers

The "New Bookmark" command can capture the active tab from:

- Safari
- Google Chrome
- Arc
- Dia

The extension automatically detects which supported browser is frontmost.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```
