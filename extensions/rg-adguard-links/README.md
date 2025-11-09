# RG AdGuard Links

Browse and jump to AdGuard filter list resources (official lists, frequently used community lists, documentation pages) directly from Raycast.

## Features (planned)

- Quick search across core AdGuard filter lists
- Open list homepage or raw source URL
- Copy list URL to clipboard
- Filter by category (privacy, security, annoyance, DNS, etc.)
- Offline cached list metadata (refresh command)

## Current Status

Initial scaffold only. Command implementation will follow.

## Commands (initial plan)

1. AdGuard Links (List view): Shows curated filter list entries.
2. Refresh AdGuard Index (Action): Re-fetch metadata JSON.

## Installation (local dev)

Inside this extension folder run:

```
npm install
```

Then in Raycast: Development > Import Extension.

## Contributing

Add or adjust filter list entries in `src/data/lists.ts` (will be added in a subsequent commit). Keep entries minimal: `id`, `name`, `category`, `homepage`, `rawUrl`.

## Notes

Screenshots will be added in `metadata/` once the list view is implemented.

