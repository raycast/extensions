# CLAUDE.md

Guidance for Claude Code when working in this directory (`raycast-claude-code-resume/`).

## What this is

A Raycast extension that turns Raycast into the **front door to Claude Code sessions**.
The primary action everywhere is **launch into an interactive `claude` session**; copying a
command is only the fallback. That is the governing concept.

Two hard constraints shape every decision:

1. **Stay on the flat-rate path.** Only launch *interactive* `claude`. Never use `-p` /
   stream-json / the Agent SDK / ACP — those are metered. Reading files under
   `~/.claude` is free; do that for anything informational.
2. **No extra binaries.** The `claude` CLI on PATH is the only hard dependency.

## Layout

```
src/
  list-sessions.tsx   List/search session history → resume (primary) / copy (fallback)
  open-project.tsx    Pick a recent project → start claude there (new / --continue)
  setup.tsx           Verify the detected .claude stores + claude binary; open preferences
  lib/
    platform.ts       Store resolution, command building, launchInteractive() — the core
    sessions.ts       Read & parse the project JSONL into Session[] (each tagged by backend)
scripts/
  clean.mjs           OS-independent node_modules cleanup, keeps package-lock.json (pwsh-safe)
docs/
  windows-native-claude.md  Notes on the WSL + Windows-native backend design
mise.toml             Pinned Node toolchain + all build tasks
```

`lib/platform.ts` is the heart. A session belongs to a **backend** (`native` or `wsl`); on
Windows the extension auto-detects and reads *both* the Windows-native store
(`%USERPROFILE%\.claude`, via `os.homedir`) and the WSL store, tagging each session so it
relaunches in the right place. `launchInteractive(cwd, extra, backend)` opens the matching
terminal so the user's full dev env is reproduced, then throws on failure so callers fall back
to copying via `buildCommand()` (also backend-aware):

- mac native → the terminal picked in preferences (`macTerminal`): Terminal.app or iTerm2
  via `osascript`, or Ghostty via `open -na Ghostty --args -e ...` (`-e` = `initial-command`,
  first surface only — never `--command=`, which re-runs claude in every new tab). All open a
  login shell. Default is Terminal.app.
- Windows + `wsl` → `wt + wsl` with the login shell + `-lic` (loads mise → node/npx for MCP).
- Windows + `native` → `wt + PowerShell` running a temp `.ps1` that **rebuilds PATH *and*
  PATHEXT** from the persisted machine+user environment (a GUI-spawned shell inherits a broken
  one — PATHEXT arrives as just `.CPL`, so bare `claude` wouldn't resolve) and then dot-sources
  the user profile (mise activate, node/npx). This is the PowerShell analogue of WSL's `-lic`.

Environment/backend info is only surfaced in the UI when more than one backend exists (e.g. a
Windows user with both WSL and native sessions); on a single-environment host it's hidden.

## Conventions

- **All UI text and code comments are in English.** Keep it that way — do not introduce Japanese.
- TypeScript only (Raycast requirement). React with `useEffect`/`useState`.
- `@types/react` 19.0.10 and `@types/node` 22.19.17 are exact direct dependencies to avoid
  the TS2786 bigint error against @raycast/api's React 19. Verify the build before changing them.
- Be careful with quotes in `Action`/label strings — an autocapitalizer can rewrite words on
  `ray lint --fix`; avoid inner double-quotes in titles.
- **No `menu-bar` commands.** Raycast for Windows doesn't support them, and this extension
  targets Windows (both WSL and native). Surface resident info as a `view` command instead.
- **Self-contained features only.** A user who installs only this extension must get the full
  feature. Don't depend on any external tool or its files (e.g. a third-party statusline).

## Build / dev

Run tasks through mise (the toolchain is pinned):

```bash
mise run build     # ray build -e dist (includes type check) — the fast local verify
mise run lint      # ray lint (ESLint + Prettier)
mise run dev       # ray develop (hot reload, on the same OS as the Raycast app)
```

`ray develop` only runs on the **same OS as the Raycast app**, and `node_modules` is per-OS
(native esbuild) — to test the Windows backends, clone the repo on Windows and use the same
mise flow there (`winget install jdx.mise`, then `mise trust` → `mise install` →
`mise run install` → `mise run dev`). Windows uses the same mise + npm flow.
Always run `mise run build` and `mise run lint` before committing.
