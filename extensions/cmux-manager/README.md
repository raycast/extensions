# cmux for Raycast

Manage [cmux](https://cmux.com) workspaces from Raycast.

## Commands

- **New Workspace** — create a new workspace with a name (and optional working directory).
- **Go to Workspace** — fuzzy-find and switch to an existing workspace.
- **Rename Workspace** — pick a workspace and rename it.

## How it works

Each command shells out to the cmux CLI bundled with the app
(`/Applications/cmux.app/Contents/Resources/bin/cmux`):

| Command | cmux CLI |
| --- | --- |
| New Workspace | `cmux new-workspace --name "<name>" [--cwd <path>]` |
| Go to Workspace | `cmux list-workspaces --json` → `cmux select-workspace --workspace <ref>` |
| Rename Workspace | `cmux list-workspaces --json` → `cmux rename-workspace --workspace <ref> "<name>"` |

If the CLI is not at the default location, set its path in the extension preferences.

## Development

```sh
npm install
npm run dev      # loads the extension into Raycast in development mode
npm run build    # type-check + build
```
