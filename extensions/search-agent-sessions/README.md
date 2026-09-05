# Agent Session Search

Full-text search across every Claude Code and Codex CLI session on your machine, and one keystroke to pick up where you left off.

Your transcripts already hold the answer to "how did I fix that last month". They are just unsearchable, sitting as gigabytes of JSONL under `~/.claude/projects` and `~/.codex/sessions`.

## What it does

- **Search as you type.** Every user and assistant message across both agents, ranked so the tightest match comes first. The matched words are marked in the row and in the transcript — and a query the transcript holds whole is marked whole, not word by word.
- **Resume from the result.** Enter starts `claude --resume` or `codex resume` in your terminal, in the session's own project directory. If the session is already running in an Orca pane, Enter jumps to that pane instead of starting a second one.
- **Read before you jump.** Tab opens a transcript pane showing the messages around the match, with pasted screenshots rendered inline.
- **Open what a session mentions.** `⌘⇧O` lists the files named in the transcript on screen and opens the one you pick.
- **Narrow the field.** Filter by agent or project from the dropdown, or type `dir:pixie` and `agent:claude` in the query.

## Setup

Raycast asks for three things on first run:

- **Search Root**, the directory your projects live in, `~/code` or `~/dev` or wherever. Enter `~` to search your whole home directory.
- **Resume Sessions In**, the terminal that runs the resume command.
- **Open Files With**, the app that opens transcripts and the files they name.

All three are changeable later with `⌘⇧,` from the results list.

## Requirements

Claude Code or Codex CLI, with sessions on disk. Nothing else — the search runs on the `grep` every Mac already has.

Nothing is sent anywhere. Every transcript is read locally, and the index never leaves your machine.

## Making it faster

The search runs about forty times faster on [ripgrep](https://github.com/BurntSushi/ripgrep) than on system `grep`. If you already have it, it is found and used and there is nothing to do.

If you don't, **Install Ripgrep for Faster Search** in the `⌘K` action panel fetches it: a pinned release from ripgrep's own GitHub releases page, checked against a SHA-256 digest compiled into this extension and discarded unless it matches, then kept beside the index. It is the only time the extension touches the network, it only happens when you ask, and if anything goes wrong the search carries on with `grep`.

## Preferences

`⌘⇧,` from the results list opens these; so does **Open Extension Settings** in the `⌘K` action panel.

| Preference          | Default                            | What it does                                                                                                                                                                   |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Search Root         | asked for on first run             | Where you keep your projects, such as `~/code` or `~/dev`. Sessions whose working directory sits outside it are hidden. Enter `~` to search your whole home directory.         |
| Ignored Directories | build output, caches, scratch dirs | Comma-separated directory names. A session is hidden when its working directory has one as a path component. Exact and case-sensitive, so `dist` does not match `distributed`. |
| Resume Sessions In  | asked for on first run             | Where the resume command runs, in the session's own project directory: Orca, Ghostty, WezTerm, Kitty, Alacritty, iTerm or Terminal.                                            |
| Open Files With     | asked for on first run             | Orca, VS Code, Cursor, Zed, VSCodium, Sublime Text, TextEdit or System Default. Images, PDFs and documents always go to whichever app macOS has for them.                      |

The two app settings are short lists rather than every app you have installed: a terminal is only offered if the extension knows how to hand it a command, so whatever you pick actually resumes. **System Default** covers any editor that is not listed, opening files through your normal file association.

Pick Orca for either and it does something the others cannot: reattach to the pane already running a session, and open a file in the worktree it belongs to. Orca only accepts files inside a worktree it knows about, so anything else, raw transcripts included, falls through to VS Code, Cursor, Zed, VSCodium, Sublime Text and finally TextEdit.

Nothing here requires [Orca](https://orca.computer). Without it, sessions resume in your terminal and files open in your editor; with it, a running session is reattached rather than restarted.

## Query syntax

| Query               | Matches                                          |
| ------------------- | ------------------------------------------------ |
| `retry backoff`     | sessions containing both words, anywhere         |
| `dir:pixie retry`   | ...whose project directory path contains `pixie` |
| `agent:codex retry` | ...that are Codex sessions                       |

## Indexing

The first run indexes your transcripts, a few seconds for a few gigabytes; after that every run refreshes only what changed. The index lives in the extension's own support directory, so uninstalling takes it with you. It is derived data either way: deleting it costs you one rebuild and nothing else.
