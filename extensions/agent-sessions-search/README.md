# Agent Sessions (Raycast)

Search and resume coding-agent sessions across tools. Claude Code and Codex are supported today; the provider interface is designed so Cursor can be added later.

Everything is local: transcripts are read from `~/.claude` and `~/.codex`, the index lives in Raycast's support directory for this extension, and nothing is uploaded anywhere.

## What it does

- **One search box over every historical session**, not only recent ones: PR numbers (`832`, `#832`, `PR 832`, a GitHub PR URL), Linear keys (`ZAP-1793`), branch names, file names, symbols, or any phrase from the conversation.
- **PR-aware ranking.** A session that actually worked on PR #832 (Claude `pr-link` record, branch `pr-832-…`, the PR URL in your prompt) ranks far above a session where "832" merely appears in some output.
- **Metadata per session:** agent, title, project/repo, branch, created and last-activity dates, PR and issue tags, message count, the prompt that started it and the last one.
- **Resume in one keystroke.** Enter opens the session where it came from: Claude Desktop (`claude://resume?session=<id>`) or the Codex app (`codex://threads/<id>`) for desktop-created sessions, otherwise `claude --resume <id>` / `codex resume <id>` in your terminal, in the session's working directory. Both options are always available in the action panel, along with copy-command, copy-id, open-PR, show-in-Finder and open-in-editor actions.

## Install and run locally

Requirements: Raycast 1.9x+ (ships Node 22, whose built-in `node:sqlite` provides FTS5), Node 22+ and npm on your machine for building.

```bash
git clone https://github.com/testerez/raycast-agent-sessions.git
cd raycast-agent-sessions
npm install
npm run dev
```

`npm run dev` runs `ray develop`, which registers the extension in Raycast in development mode and hot-reloads on changes. Open Raycast and run **Search Agent Sessions**. The first run indexes all transcripts (about 10 s for 1,600 files / 3 GB here) and shows a progress toast; later runs only touch files that changed.

To keep using it without the dev server running, build once and let Raycast keep the last dev build, or import it via **Import Extension** in Raycast pointing at this folder:

```bash
npm run build
```

Commands:

| Command | Purpose |
| --- | --- |
| Search Agent Sessions | The search UI. Refreshes the index incrementally on open. |
| Refresh Sessions Index | Background command (every 30 min) that indexes new or changed transcripts. |
| Rebuild Sessions Index | Drops the index and rebuilds from scratch (use after changing config paths). |

Preferences: terminal app (Terminal, iTerm2, Ghostty, Warp), default resume target (auto / desktop app / terminal), Claude config dir, Codex home, CLI command names, whether to include archived Codex sessions.

## How it works

```
src/
  search-sessions.tsx      Raycast List UI (detail pane, agent dropdown, actions)
  refresh-index.ts         background incremental refresh
  rebuild-index.ts         drop + full rebuild
  lib/
    types.ts               SessionProvider interface + shared types
    providers/claude.ts    ~/.claude/projects/**/<session>.jsonl parser
    providers/codex.ts     ~/.codex/sessions/**/rollout-*.jsonl parser (+ state_N.sqlite titles)
    indexer.ts             discovery, change detection, append-only incremental parsing
    index-runner.ts        spawns the index worker (Raycast caps a command at 100 MB heap)
    config.ts              index configuration shared with the worker
  worker/index-worker.ts   standalone indexing process, bundled to assets/index-worker.cjs
    db.ts                  node:sqlite schema: sessions, messages, messages_fts (FTS5), refs
    search.ts              query parsing (PR / Linear / text) and ranking
    refs.ts                PR & issue reference extraction with source-weighted scores
    text.ts                strips injected system blocks, rebuilds slash commands, titles
    git.ts                 repo detection from cwd (worktree-aware), project labels
    resume.ts              deep links and terminal launchers
```

### Indexing

- Indexing runs in a child process started with Raycast's own Node binary (`assets/index-worker.cjs`, built by `npm run build:worker`, which `npm run dev` and `npm run build` call first). Raycast kills a command whose JS heap exceeds 100 MB, and a first full index over 3 GB of transcripts peaks around 340 MB, so this is required, not an optimisation. Only `session_meta`, titles, user/assistant text and tool-call lines are JSON-parsed; tool outputs and attachments are skipped by a byte-level prefilter.
- Providers discover transcript files and parse them into `messages` (user, assistant, a compact one-line entry per tool call) plus session metadata. Subagent transcripts, Codex "guardian" review threads, and Codex threads that are imports of Claude sessions are recorded as hidden so they never duplicate results.
- Files are append-only logs, so a changed file is re-read from the byte offset where indexing stopped last time. A shrunk or rewritten file is re-parsed fully. Unchanged size + mtime means skip.
- A synthetic "meta" document per session holds title, branch, repo and cwd so they participate in full-text ranking with a higher weight.
- Structured references are extracted while indexing and stored in `refs` with a source and weight: Claude `pr-link` records (40), `pr-832` in a branch (30), PR URLs in your prompts (25), `PR #832` mentions in your prompts (15, capped), assistant mentions (4, capped), Linear keys likewise.

### Search and ranking

1. The query is parsed: PR intent (`832`, `#832`, `PR 832`, GitHub PR URL with repo), Linear keys, and remaining free text.
2. Free text becomes an FTS5 expression. Each term is a quoted phrase of its alphanumeric tokens, so `foo_bar.ts` matches `foo bar ts` in order, `zap-1795-in-person` matches the branch, and the last term gets a prefix `*`. Stage 1 is AND; if it yields fewer than 15 sessions, stage 2 adds OR matches at a discount.
3. Per-message BM25 scores are aggregated per session (best message, tool lines at 0.5, meta doc at 1.6), plus a small bonus for the number of matching messages.
4. Ref boosts are added for the PR number / issue keys in the query, plus a repository match when the query was a PR URL. A query found in the title adds a graded boost (contains 10, whole word / prefix up to 16, exact title 22); a branch substring counts 12; the two are not summed since branch names usually restate the title.
5. A recency boost of up to 6 points decays with a ~3-week time constant.
6. Sessions pinned in the Claude Desktop sidebar (`isStarred` in the app's per-session metadata under `~/Library/Application Support/Claude/claude-code-sessions/`) get +8 and show a pin accessory. Pin state is read live (asynchronously, cached by file mtime), not indexed, so pinning takes effect within seconds and needs no reindex. Only the desktop session's current transcript counts as pinned, not the transcripts it used before a `/clear`. With an empty query, pinned sessions are listed first. Empty query lists the most recently active sessions.

The detail pane shows the best matching snippet and a "why" line listing the signals that ranked the session (linked PR, branch, your mention, assistant mention, title/branch substring).

## Ideas borrowed from other projects

- **Agent Sessions** (jazzyalex): SQLite FTS5 as the index, title precedence for Claude (`custom-title` > `ai-title` > `summary` > first prompt), Codex `session_index.jsonl` titles, subagent detection.
- **heyitaki's search-agent-sessions** (Raycast extension PR): the list of injected wrapper tags to strip (`<system-reminder>`, `<command-*>`, `<local-command-*>`, …), corpus refresh from a stored byte offset, skipping `subagents/` directories, running terminal commands under a login shell.
- **Codex Sessions** (Raycast store) and **Claude Code History Viewer** (jhlee0409): reading `~/.codex/state_<N>.sqlite` `threads` for titles, branch, cwd and archived state, probing columns defensively; `codex://threads/<id>` deep links; excluding `exec`/subagent thread sources.
- **ClaudeCast** (qazi0): reconstructing `/command args` from `<command-name>`/`<command-args>` blocks, `claude --resume`, Warp launch configurations, `open -na Ghostty --args -e …`.
- **Threadlens** (moinulmoin): staged FTS matching (AND, then OR) combined with recency.
- **codex-trace** (Victarry): the reference for Codex rollout record shapes (`session_meta`, `turn_context`, `response_item`, `event_msg`).
- **claude-resume** (langwatch): BM25 with a recency multiplier.

Two things were found by inspecting the installed apps rather than any project: Claude Desktop's `claude://resume?session=<uuid>` handler (imports a CLI session when needed), and the `external_agent_session_imports.json` file that lets us hide Codex threads that are imported copies of Claude sessions.

## Adding Cursor later

Implement `SessionProvider` in `src/lib/providers/cursor.ts` (discover, parse to messages + state, prepare) and add it to `providers/index.ts`; add an `AgentId` and a resume strategy in `resume.ts`. Cursor's chats live in `~/Library/Application Support/Cursor/User/workspaceStorage/*/state.vscdb` (and a `conversation-search.db` in `globalStorage`), so the provider would read SQLite rather than JSONL, which the same `db.ts` machinery already supports.

## Limitations

- Subagent transcripts are not searchable (their text belongs to a parent session that is not resumable from them).
- Tool results and pasted file contents are not indexed, only user/assistant text and one line per tool call (tool name + path/pattern/command). This keeps the index at ~100 MB for ~3 GB of transcripts and makes ranking about the conversation rather than about dumped files.
- `codex resume` in a terminal requires the `codex` CLI on your PATH; if it is missing, the command falls back to the CLI bundled inside the Codex app.
- Ghostty and Warp launchers follow the documented patterns but were only exercised with Terminal.app and iTerm2 on this machine.
