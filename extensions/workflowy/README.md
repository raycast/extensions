# Workflowy

Search, capture, and manage your Workflowy account from Raycast.

## What it does

- Search your Workflowy graph from a local SQLite cache
- Capture quickly to your default destination or directly to Today
- Choose a destination, note, and item type with Advanced Capture
- Open Workflowy shortcuts and your own saved bookmarks
- Browse a Workflowy location, drill into child items, and add new items in place
- Browse tags and complete tasks without leaving Raycast
- Sync your local cache on demand, with background refresh when the cache is stale

## Requirements

- A Workflowy account
- A Workflowy API key from https://workflowy.com/api-key/

## Setup

1. Open the Workflowy extension preferences in Raycast.
2. Paste your Workflowy API key.
3. Optionally configure:
   - **Quick Capture Default Destination**
   - **Quick Capture Default Type**
   - **Capture Position**
   - **View Workflowy Default Location**
   - **Open Workflowy Links In**
4. Run **Sync Workflowy Cache** once, or open a command that triggers the first sync.

## Commands

| Command | What it does |
| --- | --- |
| **Search Workflowy** | Search your local cache of Workflowy items, with recent items shown when the search field is empty. |
| **Quick Capture** | Fast no-view capture using your configured default destination and item type. |
| **Capture Item** | Capture with destination, note, and item-type controls. |
| **Add to Today** | Send a task or note directly to your Workflowy Today target. |
| **Open Workflowy Location** | Open a Workflowy shortcut or a saved Raycast bookmark. |
| **View Workflowy** | Browse a default Workflowy location, drill into child items, complete tasks, and add items in place. |
| **Browse Workflowy Tags** | Browse all extracted tags from your local cache and jump into tagged items. |
| **Complete Workflowy Task** | Find incomplete tasks and mark them complete from Raycast. |
| **Sync Workflowy Cache** | Force a full account sync into the local cache. |

## How it works

- Search, tag browsing, and many navigation flows run against a local cache on your Mac.
- Full-account sync uses Workflowy's `nodes-export` endpoint and is rate-limited to once per minute.
- Writes go through Workflowy's documented write endpoints and update the local cache after success.
- The extension always uses full UUIDs for write operations.

## Local development

```bash
npm install
npm run check
```

If you have the Raycast CLI available locally, you can also run:

```bash
npm run build
npm run lint
npm run dev
```

## Architecture reference

- https://github.com/rodolfo-terriquez/workflowy-local-mcp
