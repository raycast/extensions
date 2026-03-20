# Ahotu Event Search - Raycast Extension

A Raycast extension for searching and browsing sports events from the Ahotu database.

> **Note**: This extension is part of the [ahotu-site](https://github.com/Worlds-Sports-Group/ahotu-site) monorepo, located at `apps/raycast-ahotu-search`.

## Features

- 🔍 **Fast Event Search**: Search through thousands of sports events instantly
- 🎯 **Advanced Filters**: Use inline filters for precise searches
- 📋 **Quick Actions**: Copy event IDs, names, and URLs with keyboard shortcuts
- 🌐 **Direct Links**: Open event pages and admin panels directly from Raycast

## Installation

**For Team Members**: See [QUICK-START.md](QUICK-START.md) or [INSTALL-FOR-TEAM.md](INSTALL-FOR-TEAM.md) for simple installation instructions.

### Prerequisites

- [Raycast](https://raycast.com/) installed on your Mac
- Node.js 18 or later
- An Ahotu API token with access to the events API

### Quick Install (No Git Required)

1. **Get the release package** from your team or download from the release server
2. **Extract and install**:
   ```bash
   tar -xzf raycast-ahotu-search-*.tar.gz
   cd raycast-ahotu-search
   ./install.sh
   ```
3. **Configure your credentials** in Raycast preferences (⌘ + ,)

### Developer Setup (From Source)

If you're working on the extension from the ahotu-site monorepo:

1. Navigate to the extension:
   ```bash
   cd /path/to/ahotu-site/apps/raycast-ahotu-search
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Import to Raycast:
   ```bash
   pnpm dev
   ```

4. Configure in Raycast preferences:
   - Set **API Base URL**: `https://core.ahotu.com`
   - Set **User Email**: Your Ahotu account email
   - Set **User Token**: Your Ahotu user token
   - Set **API Key**: Your Ahotu API key

## Usage

### Basic Search

1. Open Raycast (⌘ + Space)
2. Type "Search Events" or use the configured shortcut
3. Start typing to search for events:
   - `marathon` - Find all marathons
   - `boston` - Find events in Boston
   - `triathlon 2024` - Find triathlons in 2024

### Advanced Filters

The search supports powerful inline filters from the Ahotu autocomplete API:

#### Geographic Filters
- `country:USA` - Events in USA (use ISO 3-letter codes: USA, FRA, GBR, etc.)
- `reg:California` - Events in California region
- `reg:"New York"` - Events in New York (use quotes for multi-word regions)

#### Date Filters
- `@2024` - Events in 2024
- `@2025` - Events in 2025
- `month:6` - Events in June
- `month:jun,jul` - Events in June or July

#### Status & Type Filters
- `@client` or `client:true` - Only client events
- `status:ok` - Only active events
- `status:ok,archived` - Active or archived events
- `rp:runsignup` - Events using RunSignUp registration platform

#### ID & Permalink Filters
- `id:12345` - Find event by ID
- `id:12345,67890` - Find multiple events by ID
- `permalink:boston-marathon` - Find by permalink
- `wm_id:12345` - Find by WorldsMarathons ID

#### Exclusion Filters
- `-virtual` - Exclude events with "virtual" in the name
- `-cancelled` - Exclude cancelled events

#### Other Filters
- `pop:small` - Events in small population areas
- `pop:medium` - Events in medium population areas
- `pop:large` - Events in large population areas

### Combine Filters

You can combine multiple filters for powerful searches:

```
marathon country:USA @2024 -virtual
triathlon month:jun,jul reg:California
10k country:FRA @2025 @client
```

### Keyboard Shortcuts

When viewing search results:

- **Enter** - Open event page (`core.ahotu.com/events/{id}`)
- **⌘ + O** - Open in admin panel (`core.ahotu.com/v1/a_events/{id}`)
- **⌘ + I** - Copy event ID
- **⌘ + N** - Copy event name
- **⌘ + U** - Copy event URL

## API Authentication

### Getting Your Credentials

To use this extension, you need three credentials from Ahotu:

1. **User Email**: Your Ahotu account email
2. **User Token**: Your Ahotu user authentication token
3. **API Key**: Your Ahotu API key

These credentials are required for the API to authenticate requests to the `/v1/a_events/autocomplete` endpoint using the headers: `X-User-Email`, `X-User-Token`, and `X-Api-Key`.

### Setting Your Credentials

1. In Raycast, open the extension preferences:
   - Open Raycast
   - Search for "Search Events"
   - Press ⌘ + ,  (Command + Comma) to open preferences

2. Enter your credentials:
   - **API Base URL**: `https://core.ahotu.com` (default)
   - **User Email**: Your Ahotu account email
   - **User Token**: Your authentication token
   - **API Key**: Your API key

## Development

### Project Structure

```
raycast-ahotu-search/
├── src/
│   ├── search-events.tsx  # Main search command UI
│   ├── api.ts            # API client for Ahotu
│   └── types.ts          # TypeScript type definitions
├── package.json          # Extension manifest
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

### Available Scripts

- `pnpm dev` - Start development mode
- `pnpm build` - Build the extension
- `pnpm lint` - Run ESLint
- `pnpm fix-lint` - Fix ESLint issues
- `./create-release.sh v1.0.0` - Create distribution package

### Modifying the Extension

#### Changing API Authentication

If your Ahotu instance uses different authentication, modify the headers in `src/api.ts`:

```typescript
// For session-based auth:
headers: {
  "Content-Type": "application/json",
  "Cookie": `session=${this.apiToken}`,
}

// For API key header:
headers: {
  "Content-Type": "application/json",
  "X-API-Key": this.apiToken,
}
```

#### Adding More Commands

To add additional commands (e.g., "View Recent Events", "Browse by Sport"):

1. Add the command to `package.json`:
   ```json
   {
     "name": "browse-sports",
     "title": "Browse by Sport",
     "description": "Browse events by sport",
     "mode": "view"
   }
   ```

2. Create `src/browse-sports.tsx` with your command implementation

## Troubleshooting

### "API request failed: 401"
- Check that your API token is correct
- Verify the token has access to the autocomplete endpoint

### "API request failed: 404"
- Verify the API Base URL is correct (should be `https://core.ahotu.com`)
- Check that the `/v1/a_events/autocomplete` endpoint exists

### No results appearing
- Make sure you're typing at least one character
- Try simplifying your search (remove filters)
- Check the Raycast console for errors (⌘ + ⇧ + D in dev mode)

### Extension not appearing in Raycast
- Run `pnpm dev` to re-import in development mode
- Check the Raycast Extensions preferences
- Restart Raycast

### "pnpm: command not found"
- Install pnpm: `npm install -g pnpm`
- Or let the `./install.sh` script do it for you

## License

MIT

## Credits

Built for the Ahotu platform by the WSG team.
