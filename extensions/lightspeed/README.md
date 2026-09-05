# Lightspeed

Lightspeed is an independent, persistent file-search engine for Raycast on Windows. It builds and searches its own local index—Everything, Windows Search, and external search services are not required.

## Features

- Searches a persistent in-memory index as you type
- Indexes every fixed drive by default, or only locations you choose
- Refreshes the index in the background without blocking search
- Supports `ext:`, `path:`, `file:`, `folder:`, `regex:`, quotes, negation (`!`), and wildcards
- File, folder, document, image, audio, and video scopes
- Open, reveal, open-with, and copy actions
- Configurable exclusions and 50–500 result limits
- Continues to show saved results while refreshing the index
- Never modifies or deletes indexed files; all writes stay inside Lightspeed's private SQLite index
- Reuses the index across launches and performs full reconciliation at most weekly unless manually requested

## Setup

```powershell
npm install
npm run dev
```

The first launch builds the index. Search works while indexing continues, and later launches load the saved index immediately. Use **Index Preferences** to restrict indexing to specific folders if desired.

## Verification

Run `npm test`, `npm run lint`, and `npm run build` before publishing.
