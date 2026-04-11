# CoCart Raycast Extension

Search [CoCart API documentation](https://docs.cocartapi.com/) directly from Raycast. Quickly find any doc page, copy its URL, or open it in your browser.

## Features

- **Instant Search** — Fuzzy search across 120+ CoCart documentation pages
- **Organized Sections** — Docs, OpenAPI Specs, and more grouped by category
- **Open in Browser** — Jump straight to the doc page with `Enter`
- **Copy URL** — Copy the page URL with `Cmd+Shift+C`
- **Copy Title** — Copy the page title with `Cmd+Shift+T`

## How It Works

The extension fetches both CoCart's [`llms.txt`](https://docs.cocartapi.com/llms.txt) and [`llms-full.txt`](https://docs.cocartapi.com/llms-full.txt) files, parses all documentation entries, and presents them in a searchable list powered by Raycast's built-in filtering.

## Getting Started

1. [Install Raycast](https://raycast.com/)
2. Install this extension from the Raycast Store
3. Search "CoCart Docs" in Raycast

### Development

```bash
# Install dependencies
npm install

# Start development (loads extension in Raycast)
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## Commands

| Command              | Description                              |
|----------------------|------------------------------------------|
| Search CoCart Docs   | Search through CoCart API documentation  |

## Actions

| Action         | Shortcut         | Description                                   |
|----------------|------------------|-----------------------------------------------|
| Open in Browser| `Enter`          | Open the doc page in browser                  |
| Copy URL       | `Cmd+Shift+C`    | Copy the page URL to clipboard                |
| Copy Title     | `Cmd+Shift+T`    | Copy the page title                           |
| Refresh Cache  | `Cmd+R`          | Clears cache and fetches latest documentation |

## License

MIT
