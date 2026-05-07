# Codex

Browse, search, and jump to your [Codex Desktop](https://codex.openai.com) threads — all from Raycast.

Reads directly from the local SQLite databases Codex maintains under `~/.codex/`, so it works offline and never touches the network.

---

## Commands

### Search Codex Threads

Search all your threads by title, project directory, git branch, model, or first message. Threads are grouped by project so you can quickly navigate between codebases.

Actively running threads are surfaced in an **Active** section at the top.

**Actions available on each thread:**

| Action | Shortcut |
|--------|----------|
| Open in Codex | `↵` |
| Show Rollout JSONL in Finder | — |
| Open Rollout JSONL | — |
| Copy Thread ID | `⌘` `.` |
| Copy Codex URL (`codex://threads/…`) | `⌘⇧` `.` |
| Show Project Directory in Finder | `⌘F` |
| Reload | `⌘R` |

### Show Running Codex Threads

A live view (auto-refreshes every 3 seconds) of threads with recent log activity. Use this to monitor long-running tasks or jump back to a thread mid-generation.

---

## Preferences

| Preference | Default | Description |
|------------|---------|-------------|
| Codex Home | `~/.codex` | Path to your Codex data directory. Change this if you use a custom location. |
| Running Window (seconds) | `60` | How recent log activity must be to count as "running". |
| Include Archived | Off | Show archived threads in the search list. |

---

## How it works

**Thread data** is read from `~/.codex/state_5.sqlite` (the `threads` table), which stores metadata like title, working directory, model, token usage, and rollout path.

**Running detection** is inferred from `~/.codex/logs_2.sqlite` — threads with log activity within the last *N* seconds (default 60) are considered active. Threads with activity in the last 10 seconds are marked with an orange indicator.

**Deep links** use the `codex://threads/{id}` URL scheme to open a thread directly in Codex Desktop.

---

## Requirements

- [Codex Desktop](https://codex.openai.com) installed and used at least once (so the local databases exist).
- macOS 12 or later.
