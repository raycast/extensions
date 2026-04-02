# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev        # Start Raycast dev mode (live reload)
npm run build      # Production build
npm run lint       # Check ESLint + Prettier
npm run fix-lint   # Auto-fix lint/formatting issues
```

## Architecture

Raycast extension that searches session history from multiple CLI tools (Claude Code, Codex CLI) stored as JSONL files.

**Data flow:** JSONL files → provider (`providers/*.ts`) → `shared-search.tsx` (React List UI) → `actions.tsx` (terminal/IDE launch)

### Multi-Provider Design

A `SessionProvider` interface (`providers/types.ts`) abstracts all CLI-tool-specific logic. Each provider implements directory traversal, JSONL parsing, project discovery, and session search. The shared UI and actions are parameterized by the provider.

**Adding a new CLI tool requires only:**
1. Create `src/providers/<tool>.ts` implementing `SessionProvider`
2. Create `src/search-<tool>-sessions.tsx` (thin wrapper passing provider to `SessionSearchView`)
3. Add a command entry in `package.json`

### Module Responsibilities

- **`types.ts`** — Shared interfaces: `SessionInfo`, `MessageSnippet`, `SessionSearchResult`, `ProjectInfo`
- **`utils.ts`** — Shared utilities: `streamJsonl()` (streaming JSONL parser with early-close), `collectMessage()` (preview/match accumulation), `extractSnippet()`, `getProjectLabel()`
- **`providers/types.ts`** — `SessionProvider` interface (id, displayName, assistantLabel, resumeCommand, discoverProjects, searchSessions)
- **`providers/claude.ts`** — Claude Code provider. Reads `~/.claude/projects/{encoded-path}/{sessionId}.jsonl`. On Windows, also scans WSL distros via `wsl exec` (gated behind the `includeWsl` preference). Exports `claudeProvider`.
- **`providers/wsl.ts`** — Shared WSL infrastructure used by both providers. `listWslDistros()` (enumerates distros via `wsl -l -q`), `wslEnabled()` (checks `includeWsl` preference), `execWsl()` (runs a shell script inside WSL, returns stdout), `streamWslFiles()` (streams JSONL file contents via `\tFILE\t` header protocol — zero record accumulation). Each provider defines its own shell scripts for discover and session scanning. Windows-only; all functions return empty on other platforms.
- **`providers/codex.ts`** — Codex CLI provider. Reads `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`. On Windows, also scans WSL distros via `wsl exec` (gated behind `includeWsl` preference). Exports `codexProvider`.
- **`shared-search.tsx`** — Parameterized `SessionSearchView` component. Debounced search (300ms), groups results by project via `List.Section`, renders conversation preview or match snippets in the detail pane.
- **`search-session.tsx`** — Claude command entry point (thin wrapper)
- **`search-codex-sessions.tsx`** — Codex command entry point (thin wrapper)
- **`actions.tsx`** — Cross-platform terminal and IDE launch. Accepts a `resumeCommand` string prop so each provider controls its own resume CLI invocation. macOS uses AppleScript for Terminal/iTerm/Warp, direct `execFile` for Ghostty/Kitty/Alacritty/WezTerm. Windows uses `exec` with `start`/`wt.exe`. WSL sessions use `wsl -d <distro>` for terminal launch and UNC paths for IDE/Finder.

### JSONL Record Structures

**Claude Code** — Files at `~/.claude/projects/{encoded-path}/{sessionId}.jsonl`:
- `type: "user"` — `message.content` is a string. Filter out `isMeta` and command prefixes via `isUserMessage()`.
- `type: "assistant"` — `message.content` is an array of blocks. Extract text via `getFirstTextBlock()`.
- `type: "custom-title"` — Contains `customTitle` field set by `/name` command.
- `cwd` field on records gives the real decoded project path.

**Codex CLI** — Files at `~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<uuid>.jsonl`:
- Envelope: `{timestamp, type, payload}` on every record.
- `type: "session_meta"` — `payload.id` (session UUID), `payload.cwd` (project path).
- `type: "event_msg"`, `payload.type: "user_message"` — `payload.message` is the user text.
- `type: "event_msg"`, `payload.type: "agent_message"` — `payload.message` is the assistant text.

### Key Patterns

- Search is case-insensitive substring matching across user prompts and assistant text responses.
- `collectMessage()` in `utils.ts` handles preview collection and search matching for all providers.
- `streamJsonl()` provides a shared streaming JSONL parser with early-close support via a `close()` callback.
- `AbortSignal` support lets `usePromise` cancel in-flight searches when the query changes.
- Codex `parseSessionFile` accepts `projectFilter` and bails early after reading `session_meta` to avoid double file reads.
- On Windows, both providers discover WSL distros and scan their session directories in parallel with native sessions. WSL scanning is opt-in via the `includeWsl` preference. File I/O uses `wsl exec` (runs shell scripts natively inside WSL) instead of UNC paths for performance. Records are streamed one at a time (never accumulated) to stay within Raycast's memory limits. WSL project dirs are keyed as `wsl:<distro>:<dir>` to avoid collisions. `SessionInfo.wslDistro` tracks origin for resume commands and path conversion.
- `resumeCommand(session: SessionInfo)` receives the full session object so providers can build context-aware commands (e.g., WSL resume via `wsl -d <distro> --cd <path> -- claude --resume <id>`).

## Code Style

- Prettier: 120 char width, double quotes
- ESLint: `@raycast/eslint-config`
- TypeScript strict mode, target ES2023
