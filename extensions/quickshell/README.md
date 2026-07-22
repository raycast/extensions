# Quick Shell Raycast

Raycast-native workspace launcher for Quick Shell on **Windows** and **macOS**.

## Commands

- **Quick Shell** — search, launch, create, discover git repos, edit, favorite, duplicate, import/export, undo/redo, preferences

**Extension preferences** (Raycast → Extensions → Quick Shell): default terminal app, default profile, show recents, multi-command tabs (Windows), block dirty branch switch.

Root search: the command is titled **Quick Shell**; its subtitle shows your 3 most recent workspaces. Register it as a fallback command so root-search text seeds the list via `fallbackText`. Open the command and use Actions (Ctrl+K) for Recent / Import / Export. Use **Add to Root Search** on a workspace to create a Quicklink.

Create, Discover, and Edit are Actions / pushed views inside Quick Shell (not separate root commands).

## Requirements

- **Raycast** for Windows or macOS
- **Node.js 22.14+** (development only)
- Windows: Windows Terminal, PowerShell, or WSL
- macOS: Terminal.app and/or iTerm2 (multi-launch opens separate windows)

## File structure

```
QuickShell.Raycast/
├── assets/              # extension and command icons (512px PNG)
├── CHANGELOG.md         # Store Version History (no version field in package.json)
├── eslint.config.js     # Raycast ESLint flat config
├── package.json         # Raycast manifest + npm metadata + preferences
├── src/
│   ├── *.tsx            # one entry file per command name in the manifest
│   ├── components/      # shared UI (forms, platform guard)
│   └── lib/             # storage, launch, validation, search, preferences
└── src/__tests__/       # Vitest unit tests (lib only; no @raycast/api in tests)
```

## Deeplinks

```
raycast://extensions/tonythethompson/quickshell/open-workspace
```

Launch context examples (after create, or to open a nested flow):

```
raycast://extensions/tonythethompson/quickshell/open-workspace?context=%7B%22focusWorkspaceName%22%3A%22QuickShell%22%7D
raycast://extensions/tonythethompson/quickshell/open-workspace?context=%7B%22mode%22%3A%22create%22%2C%22createDirectory%22%3A%22C%3A%5C%5CProjects%5C%5Cfoo%22%7D
raycast://extensions/tonythethompson/quickshell/open-workspace?context=%7B%22mode%22%3A%22edit%22%2C%22editWorkspaceId%22%3A%22%3Cid%3E%22%7D
raycast://extensions/tonythethompson/quickshell/open-workspace?context=%7B%22mode%22%3A%22discover%22%7D
```

## Development

```bash
cd QuickShell.Raycast
npm install
npm test
npm run lint
npm run build
npm run dev
```

Run `npm run build` before submitting Store changes. Do not add a `version` field to `package.json`; Store versioning uses `CHANGELOG.md`.

**Distribution:** publish via the [Raycast Store](https://www.raycast.com/store) only. GitHub Releases and WinGet do not ship Raycast sideload packages. `scripts/build-raycast-extension.ps1` is for local/dev packaging.

## Store checklist

- [x] Extension preferences for defaults, `CHANGELOG.md`, ESLint/Prettier scaffold
- [x] `useForm` validation, drafts, `launchCommand`, fallback text support
- [ ] Store screenshots (Raycast Window Capture)
- [ ] Dedicated icon for Discover Git Repos command

## Scope

Workspaces live in Raycast `LocalStorage` (`quickshell-data`), not shared `%LOCALAPPDATA%\QuickShell\` files. Use **Export Workspaces…** / **Import Workspaces…** (JSON files) to bridge with CmdPal/Run.

Raycast-local parity includes: trust/import contracts, Suggest.exe pills with local fallback (Suggest is Windows-only; Mac uses heuristics), multi-companion form + presets, terminal-host and port-in-use health warnings, copyable launch diagnostics, git launch gate (`branchTargets` + `blockDirtyBranchSwitch`), and layout section separators. Intentional gaps remain: shared LocalAppData stores / Core `worktree-branch-targets.json`, process-list health, ETW, Windows Terminal-style tab grouping on macOS.
