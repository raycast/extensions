# fxClaude

Manage separate Claude desktop accounts from Raycast.

Based on the fxcodex extension, with the same workspace list, action panels,
icon picker, executable selection, and diagnostics. Each managed workspace has
its own Claude profile. Multiple windows can stay open at the same time.

## Requirements

- macOS 14 or later
- Raycast
- Claude desktop

The extension includes a universal fxclaude CLI for Apple Silicon and Intel.
You can also select an external fxclaude 0.1.1 or later installation.

## Getting started

1. Open **fxClaude** in Raycast.
2. Select **primary** to open or focus your existing Claude window.
3. Press `Command-N` to create a workspace such as `work`.
4. Open that workspace and sign in with the other account.

Press Return on a workspace to open or focus it and close Raycast. The action
panel also offers **Focus or Open Without Closing**, **Set as Current**, and
**Refresh**. Workspace selection uses stable IDs, just as in fxcodex.

## Workspace actions

- Create a workspace and optionally select or open it.
- Choose a Raycast icon or a custom image with optional dark appearance.
- Copy the name, ID, profile path, or running process ID.
- Reveal profile folders in Finder.
- Erase profile data while keeping the workspace and its icon.
- Delete a managed workspace and its custom icon files.

Erase and delete require confirmation and are disabled while a workspace is
running. The CLI also checks the process state before changing data. The
primary profile cannot be erased or deleted.

Workspace and application renaming are omitted. Claude profiles have one
user-data directory; there is no separate Codex home directory.

## Management

**Claude** shows the installed application and can open the primary workspace.

**Preferences** selects the bundled CLI or an external executable. The
extension can install a copy into `~/.local/bin/fxclaude`, discover an existing
installation, or use a file you select. It can remove an external executable
only when it installed that copy itself. Workspace data stays in place.

**Status** shows workspaces, running instances, the app, and the selected CLI.
Its diagnostics can inspect fxclaude metadata even if the CLI is unavailable.
Optional CLI probes collect status and version responses. Diagnostic reports
include local paths and workspace names, so review them before sharing.

The extension does not check GitHub for updates. Refresh the bundled CLI from
the local source using the development command below.

## Data

Workspace definitions and Raycast icon attributes live in
`~/Library/Application Support/fxclaude`. Custom image copies live in Raycast's
extension support directory. The extension uses fxclaude's JSON commands to
change workspace metadata, including `integrations attributes get/set/remove`.
It does not read or copy account credentials.

`FXCLAUDE_HOME` overrides the CLI support directory for development and tests.
The existing Claude profile normally uses
`~/Library/Application Support/Claude`.

## Development

The source layout follows fxcodex:

```text
src/
├── fxclaude.tsx
├── components/
└── lib/
assets/
└── bin/
scripts/
└── update-cli.sh
tests/
└── cli-bridge.test.mjs
```

Install dependencies, refresh the bundled CLI, and start Raycast development:

```sh
npm ci --include=dev
npm run update-cli
npm run dev
```

`update-cli` builds the sibling Swift package at
`../../../Projects/fxClaude/fxclaude`. Set `FXCLAUDE_SOURCE` to use another
checkout. It verifies both CPU architectures and integration-command support,
applies an ad-hoc signature, and writes the executable and its SHA-256 checksum
to `assets/bin`.

To bundle an already-built universal executable:

```sh
npm run update-cli -- /path/to/fxclaude-universal-apple-darwin
```

These are local development builds. They do not carry a Developer ID signature
or Apple notarization. Store publication and release signing are separate work.

Validate changes with:

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
```

The tests run the real CLI against temporary profiles and replace only the
Raycast host API. They cover workspace lifecycle, icon persistence, JSON
handling, executable selection, and diagnostics. They do not sign in to Claude
or modify your normal profiles.

## License

MIT. Adapted from CaptureContext's fxcodex extension. Not affiliated with
Anthropic or Raycast.
