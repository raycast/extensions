# Agent Sessions (Raycast)

Search and resume coding-agent sessions across tools. Ten agents are supported: Claude Code, Codex, Cursor, Gemini CLI, Qwen Code, GitHub Copilot CLI, opencode, Crush, Goose and Droid.

Everything is local: transcripts are read from each agent's own directory, the index lives in Raycast's support directory for this extension, and nothing is uploaded anywhere.

Agents are detected, never configured: a provider whose data directory does not exist simply finds nothing, and the agent filter only offers agents you actually have sessions from.

| Agent | Sessions live in | Resumed with |
| --- | --- | --- |
| Claude Code | `~/.claude/projects/*/<id>.jsonl` | `claude --resume <id>`, or Claude Desktop |
| Codex | `~/.codex/sessions/**/rollout-*.jsonl` | `codex resume <id>`, or the Codex app |
| Cursor | `~/.cursor/projects/*/agent-transcripts/<id>/<id>.jsonl` | `cursor-agent --resume <id>` |
| Gemini CLI | `~/.gemini/tmp/<project>/chats/session-*.jsonl` | `gemini --resume <id>` |
| Qwen Code | `~/.qwen/projects/<slug>/chats/<id>.jsonl` | `qwen --resume <id>` |
| Copilot CLI | `~/.copilot/session-state/<id>/events.jsonl` | `copilot --session-id <id>` |
| opencode | `~/.local/share/opencode/opencode.db` | `opencode --session <id>` |
| Crush | `<project>/.crush/crush.db` | `crush --session <id>` |
| Goose | `~/.local/share/goose/sessions/sessions.db` | `goose session --resume --session-id <id>` |
| Droid | `~/.factory/sessions/<slug>/<id>.jsonl` | `droid --resume <id>` |

Resume commands always run inside the session's own working directory, which several of these agents require in order to find the session at all.

## What it does

- **One search box over every historical session**, not only recent ones: PR numbers (`832`, `#832`, `PR 832`, a GitHub PR URL), Linear keys (`ZAP-1793`), branch names, file names, symbols, or any phrase from the conversation.
- **PR-aware ranking.** A session that actually worked on PR #832 (Claude `pr-link` record, branch `pr-832-…`, the PR URL in your prompt) ranks far above a session where "832" merely appears in some output.
- **One index across agents.** The same query reaches a Claude Code session, the Cursor chat that followed it and the opencode run that shipped it, grouped by project.
- **Metadata per session:** agent, title, project/repo, branch, created and last-activity dates, PR and issue tags, message count, the prompt that started it and the last one.
- **Resume in one keystroke.** Enter opens the session where it came from: Claude Desktop (`claude://resume?session=<id>`) or the Codex app (`codex://threads/<id>`) for desktop-created sessions, otherwise the agent's own resume command in your terminal, in the session's working directory. Agents with no desktop app always resume in the terminal. Copy-command, copy-id, open-PR, show-in-Finder and open-in-editor actions are in the action panel.

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

Preferences: terminal app (Terminal, iTerm2, Ghostty, Warp), default resume target (auto / desktop app / terminal), Claude config dir, Codex home, the Claude and Codex CLI command names, and whether to include archived sessions. The other eight agents need no configuration — they are found in their standard locations.

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
- Providers discover transcript files and parse them into `messages` (user, assistant, a compact one-line entry per tool call) plus session metadata. Each agent has one entry in `src/lib/agents.ts` (label, icon, data directory, resume command) and one `SessionProvider` in `src/lib/providers/`; all but Claude and Codex build their result through the shared `SessionBuilder` in `providers/base.ts`.
- Sub-agent transcripts are never surfaced, since their text belongs to a parent session and they cannot be resumed: they are excluded at discovery (Claude/Cursor/Qwen `subagents/` directories, Gemini's nested chat directories, Droid's `btw/`) or recorded as hidden (`kind: "subagent"`, `parent_id`, `session_type`, `agentId`, a calling session id, or a `subagent` tag). Codex "guardian" threads and Codex threads that are imports of Claude sessions are hidden the same way.
- Agents that keep every session in one SQLite database (opencode, Crush, Goose) are indexed per session, keyed `<database path>#<session id>`, and their databases are opened read-only while the agent is running. Cursor is a hybrid: the transcript is a JSONL file, while its title, timestamps, workspace and branch come from the Cursor IDE's own key/value store, read read-only with `json_extract` so its multi-gigabyte blobs never reach this process.
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

## Adding another agent

1. Add an `AgentId` in `src/lib/types.ts` and an entry to `AGENTS` in `src/lib/agents.ts` (label, icon, data directory, CLI command, resume invocation, and a deep link if it has a desktop app).
2. Implement `SessionProvider` in `src/lib/providers/<agent>.ts` — `discover()` returns the transcripts, `parse()` fills a `SessionBuilder` — and register it in `providers/index.ts`.
3. Generate its fallback icon with `node scripts/make-agent-icons.mjs <agent>` after adding a colour to that script.

Nothing else needs touching: the agent dropdown, the index schema and the resume actions are all driven by the registry. An agent whose directory is missing costs one failed `readdir`.

**Not supported, deliberately:**

- **Aider** writes `.aider.chat.history.md` into each project rather than a central store, with no session id, no per-session timestamps and no resume-by-id — only `--restore-chat-history`, which replays the entire file. There is nothing to identify or resume, so sessions would have to be invented by splitting on a non-unique header line.
- **Amp** keeps no threads on disk at all; they live in its server's database and the CLI fetches them over the network on every access. The `~/.local/share/amp/threads/` path that some third-party tools still reference is absent from current builds. Supporting it would mean shelling out to `amp threads list --json`, which is network- and auth-bound — a different shape from every provider here.

## Limitations

- Subagent transcripts are not searchable (their text belongs to a parent session that is not resumable from them).
- Only Claude Code, Codex and Cursor were exercised against real transcripts on the development machine. The other seven providers were written from each agent's own source or shipped binary and validated against fixtures built from those schemas; their formats move, so the parsers ignore unknown record types rather than failing.
- Gemini CLI records only a hash of the working directory, so its cwd is recovered from the `.project_root` marker or the `projects.json` registry; sessions predating those lose their project association. Cursor's project slug is deliberately never decoded, because its encoding is lossy — two different paths can produce the same slug.
- Agents installed in non-standard locations (`GEMINI_CLI_HOME`, `QWEN_HOME`, `COPILOT_HOME`, `FACTORY_HOME_OVERRIDE`, a Crush project never registered in `projects.json`) are not found; only Claude and Codex have a preference to override the path.
- Tool results and pasted file contents are not indexed, only user/assistant text and one line per tool call (tool name + path/pattern/command). This keeps the index at ~100 MB for ~3 GB of transcripts and makes ranking about the conversation rather than about dumped files.
- `codex resume` in a terminal requires the `codex` CLI on your PATH; if it is missing, the command falls back to the CLI bundled inside the Codex app.
- Ghostty and Warp launchers follow the documented patterns but were only exercised with Terminal.app and iTerm2 on this machine.
