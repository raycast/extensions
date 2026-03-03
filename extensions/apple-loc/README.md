# Apple Localizations

Raycast extension for searching Apple localizations extracted from macOS/iOS system frameworks. Wraps the [apple-loc](https://github.com/yoshi2ys/apple-loc) CLI tool.

## Prerequisites

- [apple-loc](https://github.com/yoshi2ys/apple-loc) CLI installed
- Localization database built with `apple-loc build`

## Commands

| Command | Description |
|---------|-------------|
| **Search Text** | Full-text search across localized strings |
| **Lookup by Key** | Find localizations by source key (with fuzzy matching) |
| **Lookup by Target** | Find localizations by translated text |

## Features

- Filter by platform (macOS 15, iOS 18, etc.) and language
- View translations across multiple languages side by side
- Copy source keys or translations with one click
- Search history with recent lookups
- Structured translation display (e.g., device-specific variants)

## Configuration

| Preference | Default | Description |
|------------|---------|-------------|
| CLI Path | `~/.local/bin/apple-loc` | Path to the apple-loc CLI binary |
| Database Path | `~/.apple-loc/apple-loc.db` | Path to the localization database file |

## Development

```bash
npm install
npm run dev        # Start development with hot reload
npm run build      # Build the extension
npm run lint       # Lint
npm run fix-lint   # Auto-fix lint issues
```

## License

MIT
