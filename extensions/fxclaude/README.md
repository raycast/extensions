# fxClaude

Manage separate Claude desktop accounts from Raycast.

Based on the fxcodex extension, with the same workspace list, action panels,
icon picker, executable selection, and diagnostics. Each managed workspace has
its own Claude profile. Multiple windows can stay open at the same time.

## Requirements

- macOS 14 or later
- Raycast
- Claude desktop
- [fxclaude](https://github.com/CaptureContext/fxclaude) 0.1.0 or later

The extension does not bundle the CLI. Install it from **Preferences**, which
can download a verified GitHub release or use Homebrew, or choose an existing
installation. See [Executable management](#executable-management).

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
- Open a link in that workspace with **Open Link…** (`Command-L`).
- Choose a Raycast icon or a custom image with optional dark appearance.
- Copy the name, ID, profile path, or running process ID.
- Reveal profile folders in Finder.
- Erase profile data while keeping the workspace and its icon.
- Delete a managed workspace and its custom icon files.

Erase and delete require confirmation and are disabled while a workspace is
running. The CLI also checks the process state before changing data. The
primary profile cannot be erased or deleted.

Workspace and application renaming are omitted. Each managed workspace has a
user-data directory for the Claude app and a `claude-config` directory for
Claude Code, which fxclaude passes to the app as `CLAUDE_CONFIG_DIR`. Both
appear under **Show in Finder…**.

## Open links in a workspace

A plain `open claude://…` reaches whichever Claude window macOS picks. **Open
Link in Workspace** sends a link, such as a sign-in callback, to one
workspace's Claude only. The link field takes the command's argument, or the
clipboard when it holds a `claude://` link. The workspace defaults to the
current one. A running instance receives the link directly; otherwise that
workspace's Claude launches with it. **Open Link…** in a workspace's action
panel opens the same form with that workspace selected.

The command is disabled by default so it doesn't clutter Raycast's root search.
Enable it in Raycast Settings > Extensions > fxClaude to run it from the root
search. **Open Link…** in the workspace list works either way.

The command wraps `fxclaude open-url`. Other apps can route links to it through
a Raycast deeplink:

```text
raycast://extensions/maximkrouk/fxclaude/open-link?arguments=%7B%22url%22%3A%22claude%3A%2F%2F…%22%7D
```

The first link sent to a running instance can trigger macOS's Automation prompt
for Raycast. If it was declined, allow it in System Settings > Privacy &
Security > Automation. An external fxclaude needs `open-url`; older executables
report that they cannot open links.

## Management

**Claude** shows the installed application and can open the primary workspace.

**Preferences** lists every fxclaude executable it can find, selects the one
the extension uses, and installs, replaces, upgrades, or removes releases. It
stays available when no executable exists or the selected one fails. Workspace
data stays in place when an executable is removed.

**Status** shows workspaces, running instances, the app, and the selected CLI.
Its diagnostics can inspect fxclaude metadata even if the CLI is unavailable.
Optional CLI probes collect status and version responses. Diagnostic reports
include local paths and workspace names, so review them before sharing.

## Executable management

The executable manager discovers `fxclaude` in every directory from Raycast's
`PATH`, plus `~/.local/bin`, `/opt/homebrew/bin`, and `/usr/local/bin`. You can
also choose an existing executable in Finder. Every discovered or registered
path appears separately and can be selected, so a Homebrew version used in the
terminal can coexist with a version pinned for Raycast. Symbolic links are
marked in the list and expose their resolved original in Finder.

The installer loads releases from
[`CaptureContext/fxclaude`](https://github.com/CaptureContext/fxclaude/releases),
lets you open each release on GitHub, and verifies the downloaded universal
executable's SHA-256 checksum, code signature, and reported version. The
release marked **Tested** is the version exercised with the current extension
update. It is set by the extension author, not inferred from the latest GitHub
release.

Installations can target:

- the current user at `~/.local/bin/fxclaude`, with an option to add the
  directory to the user's shell `PATH`;
- a versioned directory under Raycast's extension support folder;
- any custom directory, also with optional `PATH` setup;
- Homebrew using `brew install capturecontext/tap/fxclaude` for the latest
  stable formula.

Versioned extension-support directories and custom destinations make it
possible to keep several releases at once. Extension-managed direct installs
can be replaced with any available release or uninstalled. Homebrew installs
are upgraded through Homebrew. fxclaude has no self-updater, so an installed
version changes only when you replace or upgrade it.

## Executable provenance

The downloadable CLI is built from the public
[`CaptureContext/fxclaude`](https://github.com/CaptureContext/fxclaude) source.
Its GitHub Actions release workflow builds native Apple silicon and Intel
executables, combines the universal binary, signs it with a Developer ID
Application certificate, submits it to Apple's notary service, and publishes a
matching SHA-256 checksum with the
[GitHub release](https://github.com/CaptureContext/fxclaude/releases/latest).
Release builds carry the Apple Events entitlement that **Open Link** needs to
reach a running Claude.

The extension invokes the CLI through a versioned JSON interface and does not
require a background daemon.

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
├── open-link.tsx
├── components/
└── lib/
tests/
└── cli-bridge.test.mjs
```

Install dependencies and start Raycast development:

```sh
npm ci --include=dev
npm run dev
```

The tests need a real fxclaude executable. They use `FXCLAUDE_TEST_EXECUTABLE`
when it is set, otherwise the sibling Swift package's build at
`../../../Projects/fxClaude/fxclaude/.build`, otherwise `fxclaude` on `PATH`:

```sh
FXCLAUDE_TEST_EXECUTABLE=/path/to/fxclaude npm test
```

Validate changes with:

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
```

The tests run the real CLI against temporary profiles and replace only the
Raycast host API. They cover workspace lifecycle, icon persistence, JSON
handling, executable registration and selection, link delivery errors, and
diagnostics. They do not sign in to Claude
or modify your normal profiles.

## License

MIT. Adapted from CaptureContext's fxcodex extension. Not affiliated with
Anthropic or Raycast.
