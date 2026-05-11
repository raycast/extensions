# GetNote

GetNote brings your GetNote workspace into Raycast. Browse recent notes, run semantic search, capture links and text notes, and use GetNote actions inside Raycast AI.

## Features

- Browse your 10 most recent notes with quick actions
- Search notes with semantic recall
- Save a link note and wait for async processing to finish
- Save a text note with an optional title and tags
- Open notes in the browser or jump to the original source URL
- Use GetNote tools in Raycast AI for note counts, note details, deletion, knowledge bases, and tag workflows

## Setup

1. Open the extension preferences in Raycast.
2. Configure either:
   - `Manual API Key` and `Manual Client ID`, or
   - nothing, then finish the in-app OAuth device flow the first time you run a command.
3. Manual credentials override the stored OAuth session.

## Commands

- `Recent Notes`
- `Search Notes`
- `Save Link`
- `Save Text Note`

## AI Tools

- `get-total-note-count`
- `search-notes`
- `get-note-detail`
- `save-link-note`
- `save-text-note`
- `delete-note`
- `list-knowledge-bases`
- `create-knowledge-base`
- `list-knowledge-base-notes`
- `search-knowledge-base-notes`
- `add-note-to-knowledge-base`
- `add-tags`
- `delete-tag`

## Development

```bash
npm install
npm run lint
npm run build
npm run dev
```
