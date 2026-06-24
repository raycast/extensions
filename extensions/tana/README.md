# Tana for Raycast

Use Tana Desktop's local MCP/API from Raycast. The extension connects only to
`http://127.0.0.1:8262`; it does not perform web searches, call external AI
services, proxy data through a cloud backend, or persist Tana note content.

For a Chinese step-by-step user guide with workflow diagrams, see
[`docs/tana-raycast-product-guide.md`](docs/tana-raycast-product-guide.md).

## Requirements

- Tana Desktop is running and the target workspace is loaded.
- A current Personal Token from **Tana Settings → API Tokens**.
- Raycast has the token in this extension's **Personal Token** password
  preference. The optional workspace ID acts only as the initial default.

Personal Tokens are Tana's advanced fallback authentication method. Tana
recommends OAuth for clients that support it; this extension currently uses a
Personal Token because the Raycast-to-local-MCP OAuth flow has not been proven.
Never commit a token, paste it into an issue, or include it in a screenshot.

See [Tana Local API and MCP](https://outliner.tana.inc/learn/features/local-api-mcp)
for the current server and authentication documentation.

## Commands

- **Quick Add** — capture plaintext, Unicode, or emoji to Inbox, Today, or a
  pinned target; select a workspace and one or more discovered Supertags.
- **Search Tana** — search by workspace, read nodes, page through children, open
  in Tana, open in panel/tab, check/uncheck, tag, set fields, edit, move, move
  to Trash, or add a note while browsing children.
- **Today** — browse today's daily-note children, run node actions, or capture
  directly to Today.
- **Manage Target Nodes** — search Tana and pin frequently used destinations;
  manual node ID or Tana URL entry remains available as a fallback.
- **Manage Supertags** — list real workspace tags, inspect schema Markdown,
  create a Supertag, add a field, or configure its checkbox.
- **Diagnostics** — check health, workspace readiness, MCP protocol/service
  metadata, available tools, missing core tools, and REST fallbacks without
  displaying tokens or Tana content.

Moving a node to Trash always requires a destructive confirmation. Structural
mutations use stable node IDs; move rejects the selected node itself and its
descendants as targets.

## Troubleshooting

- **Tana is not reachable** — start Tana Desktop and retry Diagnostics.
- **Authentication rejected** — create a new Personal Token, paste only the raw
  token into Raycast preferences, and remove leading/trailing whitespace.
- **Workspace is not ready** — open or switch to that workspace in Tana, then
  retry.
- **Missing required tools** — update Tana Desktop. Diagnostics lists the exact
  missing names. `open_node` and `move_node` use the documented local REST
  endpoints when those names are absent from MCP.
- **Two Tana extensions appear** — disable the Raycast Store copy while testing
  a local development installation so commands and preferences are unambiguous.

If a token was exposed in chat, logs, source control, or a screenshot, delete it
in Tana and create a replacement after testing.

## Development

```bash
npm ci
npm test
npm run lint
npm run test:store
npm run build
npm run dev
```

CI runs the same install, unit-test, Store preflight, lint, and
TypeScript/build gates on Node 22. Tests use mocked local responses and must
never contain a real token or real Tana content. Live mutation tests must use
disposable nodes and tags created solely for that test run.

Publishing to the Raycast Store is intentionally separate from local acceptance:

```bash
npm run publish
```

Do not publish from a branch that contains local audit archives, personal
tokens, personal emails, live workspace screenshots, or real node identifiers.
`npm run publish` opens a real Raycast extension pull request and should only be
run after a final release check.
