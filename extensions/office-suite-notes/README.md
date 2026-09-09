# Office Suite Notes (原子笔记)

An unofficial Raycast integration for **Office Suite / 办公套件 atomic notes (原子笔记)** on macOS. Search and read notes, browse folders, create notes, and append content without leaving Raycast.

## Requirements and setup

1. Install and launch Office Suite (`pcsuite.app`) with its Notes CLI/local API feature available.
2. Enable CLI access in Office Suite and obtain an API token from its settings.
3. Open this extension's preferences in Raycast. Enter the token in **API Token**, a password-type preference. Set **Local API Port** to the port displayed by Office Suite (default `9200`, supported `9200–9700`).
4. Run **Check Connection**. Keep Office Suite running while using the extension.

The extension uses the same loopback HTTP API as the official `notes` CLI. It does **not** execute the shell script, require Python, modify app permissions, read `~/.notes-cli.conf`, or import an existing CLI token. This avoids shell execution and makes authentication exclusive to extension preferences. No vendor CLI code is bundled.

## Commands

| Command          | Behavior                                                              |
| ---------------- | --------------------------------------------------------------------- |
| Search Notes     | Browse recent notes or search titles and content. Enter opens a note. |
| Browse Folders   | Browse roots and nested folders, view notes, or copy folder IDs.      |
| Create Note      | Create a note with required title and content; optional folder ID.    |
| Check Connection | Verify service reachability and authenticated API access.             |

Inside a note, **Copy Content** copies the original body and **Append Content** adds new content to the end. Append never replaces the existing body. Writes occur only when you submit a form and are never retried automatically. After a timeout, inspect the note before retrying to avoid duplicate writes.

Recent notes are paged, 50 per page. Use the action panel's **Next Page** / **Previous Page** actions (`⌘]` / `⌘[`). Search returns up to 100 matches. If more matches exist, the UI reports the truncation; narrow the search. The currently documented search API has no pagination parameter.

Content may be text, Markdown, or HTML. HTML is converted for preview. Remote images and link destinations are omitted in previews to avoid note-controlled network requests; copying retains original content. Folder IDs are opaque identifiers, not folder names. Rename, move, and folder writes are not included in this initial release.

## Raycast AI tools

- **Search Notes** — returns matching titles, snippets, IDs, total count, and truncation status.
- **Read Note** — returns the selected note's complete content.
- **List Folders** — lists root folders or a parent's direct children.

All AI tools are read-only. **When you enable and invoke them, returned note content is made available to Raycast AI and may be processed by the AI provider according to your Raycast settings and policies.** Do not enable them for notes you do not want processed by AI. The API token is never part of a tool input or result. Note content must be treated as untrusted data, not instructions.

## Security and privacy

- The token is configured **only** in Raycast's password preference. No `.env`, CLI config, environment-variable, or source-code credential fallback exists.
- Authenticated requests go only to `http://127.0.0.1:<port>/third-party`. Hostnames are not configurable; redirects are refused. `/health` is unauthenticated.
- There is no analytics, telemetry, remote backend, persistent note cache, token logging, or debug request logging implemented by this extension.
- Errors are sanitized: raw server bodies and underlying fetch errors are not displayed or returned to AI.
- Notes are loaded into memory for the current command. Copy actions write the requested content to the system clipboard; Raycast/system clipboard history may retain it.
- A password preference hides token entry in the UI; it is not a claim of end-to-end encryption. The local API uses HTTP as required by Office Suite. Only run trusted local software.
- Do not include credentials, personal notes, private folder names, or unredacted screenshots in issues or pull requests.

## Troubleshooting

- **Cannot reach Office Suite:** launch the app, enable CLI access, and verify the port.
- **Authentication failed:** replace the API Token in extension preferences. Do not paste it into a chat or issue.
- **Not found:** the note may have been moved to trash/deleted or the app's API may differ.
- **Write timeout:** inspect the target note before retrying; the server may already have saved it.
- **No subfolders:** use the previous folder's Browse Notes action to view its direct notes.

## Development

Use Node.js `22.22.2` or newer (required by the installed Raycast API).

```sh
npm ci
npm test
npm run build
npm run lint
npm run dev
```

Development never requires committing a token or test notes. Tests use synthetic fixtures and injected HTTP transports. For live verification, configure the token in Raycast preferences and use Check Connection/Search Notes. Do not run automated writes against a real notebook.

Before Store submission, set `package.json`'s `author` to the maintainer's actual Raycast username, validate lint/build, and capture screenshots using synthetic notes only. Publication requires Raycast review; a GitHub PR is not an approval.

## Attribution

This is an independent, unofficial integration, not affiliated with or endorsed by Office Suite or its vendor. The icon is original artwork. The API contract is based on the CLI documentation distributed with the local application. No proprietary CLI implementation or private note data is included.
