# pos — Raycast extension

Drive the [`pos`](https://github.com/glebis/pos) focus-aligned terminal cockpit from Raycast. It's a thin client over the same JSON contract the `pos` CLI exposes — `pos` emits JSON whenever its stdout isn't a TTY, so the extension just shells out and renders.

## Commands

- **pos: Focuses** — browse focus areas; drill into a focus's projects.
- **pos: Project Status** — every project grouped by focus, with git branch + a dirty marker. Open the project, launch Claude Code, load the focus (confirms), or copy the path.
- **pos: Run Command** — fuzzy-pick any `pos` command and run it; commands that take arguments prompt for them. `load`/`rm` confirm first.

## Requirements

- The `pos` CLI installed and on your login shell's PATH (`uv tool install --editable .` from the main repo).
- macOS + cmux (actions that open/close workspaces talk to cmux, exactly like the CLI).

## Setup

```sh
cd raycast
npm install
npm run dev      # loads the extension into Raycast for development
```

If `pos` isn't found, set the **pos binary** path in the extension's preferences (it otherwise auto-detects via `zsh -lc 'command -v pos'`).

## Develop

```sh
npm test         # unit tests for the pure logic (palette filtering, arg splitting)
npm run lint     # Raycast lint (types + manifest)
npm run build    # production build
```

Integration funnels through `src/lib/pos.ts`; pure, Raycast-free logic lives in `src/lib/palette.ts` so it's testable without the Raycast runtime.
