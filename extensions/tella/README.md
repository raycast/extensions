# Tella

Use Tella inside Raycast to browse videos, manage playlists, search transcripts, and query your content with AI Chat.

## What You Can Do

- View an overview dashboard (videos, views, watch time, top and recent videos)
- Browse videos in list or grid view, search, sort, and manage video settings
- Manage playlists (browse, create, rename, delete, and add videos)
- Search transcripts with cached results for fast repeat queries
- Ask questions in Raycast AI Chat with `@tella`

## Commands

- **Overview**: high-level stats and quick navigation
- **Videos**: full video browser + management actions
- **Playlists**: playlist browser + management actions
- **Transcripts**: transcript browser, search, copy, and export helpers

## AI Chat (`@tella`)

In Raycast AI Chat, type `@tella` and ask things like:

- "What did I say about onboarding?"
- "Find mentions of API limits"

The tool searches your transcripts and returns relevant excerpts with timestamps and source video links.

## Setup

1. Install the extension from the Raycast Store
2. Generate an API key at [tella.tv/account](https://www.tella.tv/account)
3. Open Tella extension preferences in Raycast and paste the key

Once configured, all commands and `@tella` are ready to use.

## Preferences

### Cache Duration

Choose how long video data stays cached before auto-refresh:

- `5` minutes
- `30` minutes (default)
- `60` minutes
- `0` (manual refresh only)

You can always force refresh from commands using `⌘R`.

## Troubleshooting

### "API key is required"

Open Tella extension preferences and set `Tella API Key`.

### Videos or transcripts not loading

- Confirm your API key is valid
- Refresh with `⌘R`
- Check transcript status for unprocessed videos

## Documentation

- [API Reference](docs/API.md)
- [Development Patterns](docs/DEVELOPMENT.md)
- [Features & Roadmap](docs/Features%20%26%20Roadmap.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Author

**Jack Vaughan** — [jackvaughan.com](https://jackvaughan.com)

## License

MIT
