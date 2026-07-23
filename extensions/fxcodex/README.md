# fxCodex

Manage isolated [Codex](https://openai.com/codex/) desktop workspaces without
leaving Raycast.

fxCodex keeps each managed workspace's Codex settings, sessions, integrations,
and browser data separate. Multiple workspaces can remain open at the same
time, and selecting a running workspace focuses its existing window instead of
launching a duplicate.

## Requirements

- macOS
- [Raycast](https://www.raycast.com/)
- The [Codex](https://openai.com/codex) desktop app installed as either `Codex.app` or `ChatGPT.app`

No separate CLI installation is required. The extension includes a universal
Apple silicon and Intel executable.

## Getting Started

1. Open **fxCodex** from Raycast.
2. Select **primary** to open your existing Codex environment.
3. Press `Command-N` to create an isolated workspace such as `work` or
   `personal`.
4. Press Return on a workspace to focus or open it and close Raycast.

The current workspace is selected automatically whenever the command loads.
Open the action panel with `Command-K` for the complete set of actions.

## Workspaces

- **Focus or Open** focuses a running workspace or launches it, then closes
  Raycast.
- **Focus or Open Without Closing** performs the same operation while keeping
  Raycast open. Its default shortcut is `Command-Return`.
- **Set as Current** selects the workspace used when a command does not specify
  one explicitly.
- **Create Workspace…** creates a new isolated workspace. Use `Command-N` from
  the main view.
- **Set Icon…** opens a searchable grid containing Raycast icons. You can
  also choose a custom image using action panel.
- **Rename…** renames a stopped managed workspace while preserving its selected
  icon.
- The **Copy Workspace** section exposes the workspace name, ID, and path. Its
  PID is also available while the workspace is running.
- **Show in Finder…** reveals the workspace, `CODEX_HOME`, or browser-data
  directory.

The primary workspace can have a custom icon, but its name and data lifecycle
are managed by Codex rather than fxCodex.

### Erase and Delete

Destructive actions remain visible while a managed workspace is running, but
are disabled until it is stopped. Once available, they always require
confirmation:

- **Erase Data…** removes the workspace's Codex settings, sessions,
  integrations, and browser data while preserving the workspace itself.
- **Delete Workspace…** permanently removes the workspace and all of its
  managed data.

## Codex Application Name

The **Codex** management screen detects the desktop application under either
supported name. It can rename `ChatGPT.app` to `Codex.app`, restore the
`ChatGPT.app` name, and optionally enforce the Codex name before fxCodex
commands run.

Renaming requires confirmation. Restoring the ChatGPT name automatically
disables the auto-rename preference.

## Executable Sources

The bundled executable is selected by default. It is universal, its checksum
can be verified from the action panel, and it never updates itself from inside
the extension.

The **Preferences** management screen remains available even when the selected
CLI cannot run, so you can recover by choosing a different executable. It also
supports an external `fxcodex` executable. You can:

- copy the bundled executable to `~/.local/bin/fxcodex` and use that copy;
- select an existing executable in Finder;
- use installations discovered in `~/.local/bin`, `/opt/homebrew/bin`, or
  `/usr/local/bin`;
- update or uninstall an external copy managed by the extension.

Automatic update preferences apply only to the external executable.

## Status and Diagnostics

The **Status** screen summarizes the current workspace, running workspaces,
Codex application, selected executable, and support folder. It also contains
diagnostics, so recovery information remains available alongside partially
valid status data. If part of the status data is missing or malformed, the
valid sections remain available and the reported problems identify what could
not be read.

Diagnostics read extension preferences and fxCodex metadata files directly by
default, without depending on a working CLI. An optional CLI diagnostics action
runs raw status and version probes when needed. Open the action panel with
`Command-K` to copy the complete report, its JSON representation, or only the
direct storage diagnostics.

Review diagnostics before sharing them because workspace names and local file
paths may be included.

## Privacy

Workspace management happens locally and the extension does not require API
keys or account credentials. Custom workspace icons are copied into Raycast's
extension support directory.

The bundled executable does not perform automatic update checks. GitHub is
contacted only when an external executable is explicitly updated or when its
optional automatic-update policy is enabled.

## Executable Provenance

The bundled CLI is built from the public
[`capturecontext/fxcodex`](https://github.com/capturecontext/fxcodex) source.
Its GitHub Actions release workflow builds native Apple silicon and Intel
executables, combines the universal binary, signs it with a Developer ID
Application certificate, submits it to Apple's notary service, and publishes a
matching SHA-256 checksum with the
[GitHub release](https://github.com/capturecontext/fxcodex/releases/latest).

The extension invokes the CLI through a versioned JSON interface and does not
require a background daemon.

## Development

Local extension development requires Node.js 22.14 or newer and npm 7 or
newer.

```sh
npm ci
npm run dev
```

To replace the bundled CLI with a specific published release, run:

```sh
npm run update-cli -- <version>
```

The target downloads the universal executable and its checksum, then verifies
the checksum, both CPU architectures, Developer ID signature, Apple
notarization, and reported version before updating `assets/bin`.

Before submitting changes, run:

```sh
npm run lint
npm run build
```

`npm run publish` validates the extension and opens or updates its pull request
in the public [`raycast/extensions`](https://github.com/raycast/extensions)
repository.

## License and Attribution

fxCodex is available under the
[MIT License](https://github.com/capturecontext/fxcodex/blob/main/LICENSE).
It is an independent open-source project and is not affiliated with or endorsed
by OpenAI or Raycast.
