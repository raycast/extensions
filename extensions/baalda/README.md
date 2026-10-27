# Baalda for Raycast

Connect [Baalda](https://baalda.com), your file-based, collaborative second brain, to Raycast.

Capture thoughts in seconds, search your vaults, and let Raycast AI read and write your notes through Baalda's built-in MCP (Model Context Protocol) endpoint.

## Features

### Commands

- **Quick Capture**: type a title (and optional markdown body), hit ↵, and it's a note in your vault. Saves as `YYYY-MM-DD-<slug>.md` in your capture folder. If the name already exists, it falls back to a timestamped file.
- **Create Note**: create a note at an arbitrary path, choosing the vault, folder, filename, title and initial markdown.
- **Manage Notes**: open, append, replace, make targeted edits, move, rename, delete and copy IDs for notes in a selected vault.
- **Create Folder**: create a folder under the vault root or any existing folder.
- **Manage Folders**: open folder notes, move, rename, delete empty folders or recursively delete their contents.
- **Search Notes**: semantic + keyword search across all your vaults (or one), with a full reader view and one-key append.
- **Browse Vault**: explore vaults, folders and notes; copy a vault ID to set as your default.

### AI tools (Raycast AI)

Ask Raycast AI things like *"what did I note about the Q4 budget?"* or *"add this to my ideas note"*. The extension exposes Baalda tools the AI can call:

| Tool | What it does |
| --- | --- |
| `baalda-list-vaults` | List accessible vaults (gives vaultIds for the others) |
| `baalda-list-folders` | List folders, paths and parent IDs in a vault |
| `baalda-list-notes` | List notes in a vault/folder |
| `baalda-search-notes` | Semantic + keyword search, ranked docIds |
| `baalda-read-note` | Full markdown of a note, with its revision |
| `baalda-create-note` | Create a note at a vault-relative path |
| `baalda-update-note` | Replace a note's full markdown content |
| `baalda-append-to-note` | Append markdown to an existing note |
| `baalda-edit-note` | Apply targeted exact-text edits to a note |
| `baalda-delete-note` | Soft-delete a note while preserving its history |
| `baalda-create-folder` | Create a folder |
| `baalda-delete-folder` | Delete an empty folder or recursively delete its contents |
| `baalda-move-note` | Rename, move or retitle a note |
| `baalda-move-folder` | Rename or move a folder and its descendants |

All write and destructive tools ask for confirmation before running. Note edits can include the revision returned by `baalda-read-note` to prevent stale writes.

## Setup

1. **Get an MCP token.** In the Baalda desktop app: **Vault Settings → MCP → Create token**. It starts with `mcp_`. The token is bound by the exact same folder permissions as your account.
2. **Configure the extension** (Raycast asks on first run, or: Extensions → Baalda → ⚙):
   - **Baalda Server URL**: `https://api.baalda.com` for the managed service, `http://localhost:3010` for a local server, or your self-hosted URL.
   - **MCP Token**: the token from step 1.
   - **Default Vault ID** *(optional)*: copy it from the Browse Vault command to skip vault selection everywhere.
   - **Capture Folder** *(optional)*: e.g. `Inbox`; Quick Capture notes go here. The folder must already exist in the vault.

That's it. Because it talks to Baalda's MCP endpoint, it works against the managed service, a self-hosted server, or a local dev server.

## How it works

Baalda exposes a Streamable HTTP MCP endpoint at `<server>/api/mcp`, authenticated with a Bearer token. This extension is a minimal JSON-RPC client for it: `initialize` once, then `tools/call`. Every read and write flows through Baalda's sync engine. Create a note here and it appears in the desktop app and on your teammates' machines. Writes are conflict-guarded by Baalda's revision tokens.

- Baalda repo: https://github.com/naveedharri/baalda
- Extension repo: https://github.com/owendavidprice/Baalda-extension-for-Raycast

## Development

```bash
npm install
npm run dev      # ray develop (loads the extension into Raycast)
npm run build    # ray build
npm run lint     # ray lint
```

## License

MIT
