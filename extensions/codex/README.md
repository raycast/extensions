# Codex

Monitor and manage your Codex threads, MCPs, projects, and usage directly from Raycast.

## Commands

### Manage MCP Servers

Inspect the MCP servers Codex knows about, their sign-in state, where each one is configured, and the tools they offer.

- Install, edit, enable, disable, or uninstall servers in your personal Codex configuration.
- Show Project Servers lists the MCP servers a Codex project's own configuration adds, picked from your Codex projects or any folder. Codex keeps project configuration read-only.
- Admin-managed configuration shows up too, and stays locked.
- Start Codex OAuth sign-in and reload MCP configuration.
- Show Configuration redacts secret values. The command never runs MCP tools or MCP server processes.
- Uninstall deletes only the selected Codex configuration entry. The server's software and any OAuth access stay in place.

### Browse Projects

Browse the projects configured in the Codex desktop app, including their pinned order, primary and attached folders, and the threads assigned to them.

- **Open in Desktop** (⌘↵) opens a new composer with the saved project selected, keeping the desktop app's current mode.
- Open an assigned thread in Codex.
- Reveal available project folders in Finder or copy their paths.
- Inspect project folder and activity details.
- Refresh to re-read Codex's project data. The command never writes to it.

### Usage Stats

View your Codex rate limits and token usage.

- Rate limits per plan window, with percent used and the next reset time.
- Available rate limit reset credits, when your plan includes them.
- Token usage for today, the last 7 days, and all time, plus your current daily streak. Usage comes from Codex's account statistics and can take time to reflect recent activity.
- Refresh on demand, or jump straight to Codex.

### Search Threads

Browse active and archived Codex threads. Search recent names, working directories, and previews immediately; queries of at least three characters search your full transcript history.

- Threads waiting on your approval or input are grouped at the top.
- Each thread shows its working directory, git branch and commit, status, model and reasoning effort, and subagent count.
- **Resume** in the Codex app, or in your terminal with the `codex resume` command. Resume in Terminal opens the app set in the **Terminal App** preference.
- **Browse Child Threads** to see what a thread started: subagents, scheduled automations, and the review, compaction, memory, and Guardian threads Codex runs on its own.
- **Summarize** a thread, then copy or paste the result, or **auto-rename** it with Raycast AI. You can also rename the last 5 to 50 threads in one pass.
- **Fork**, **archive**, and **unarchive** threads.
- **Export** a thread to Markdown, saved to your Downloads folder.
- **Copy** a thread's ID, resume command, working directory, deeplink, or last message.

### New Thread

Start a new thread in your default working directory.

### New Thread with Prompt

Start a thread with a typed prompt and a working-directory picker. The picker lists subfolders from your Working Directory Root, with recent thread counts when available, plus a Choose Folder option with a native folder chooser.

### New Thread from Clipboard

Start a thread using clipboard text as the prompt. It opens in your Default Working Directory, or the app's default when that preference is empty.

### New Thread from Selected Text

Start a thread using selected text from the frontmost application as the prompt. It opens in your Default Working Directory, or the app's default when that preference is empty.

Assign this command a hotkey in Raycast to send a selection directly to Codex without an intermediate form. If the selection is empty or cannot be read, the command shows a message and does not start a thread.

### Open Codex

Open Codex in the ChatGPT desktop app.

## Requirements

- The ChatGPT desktop app for macOS, with Codex available and signed in.
- The Codex CLI (detected automatically, see below). Full transcript search requires a version whose `app-server` supports it.
- Raycast AI (Raycast Pro) for the Summarize and Auto Rename actions.

### Codex CLI in a non-standard location

The extension detects the `codex` binary automatically by searching:

1. The **Codex CLI Path** preference, if set
2. The ChatGPT app bundle (`/Applications/ChatGPT.app/Contents/Resources/codex`)
3. `~/.codex/packages/standalone/current/codex` (standalone installer)
4. `/opt/homebrew/bin/codex` (Homebrew on Apple Silicon)
5. `/usr/local/bin/codex` (Homebrew on Intel)
6. `~/.local/bin/codex`
7. Your login shell (`command -v codex`)

If none match, set the path manually in the **Codex CLI Path** preference.

## Preferences

| Preference                    | Description                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **New Thread Mode**           | Which mode to open new threads in: Codex, ChatGPT Work, or regular ChatGPT Chat. Working directory settings apply to Codex and Work. |
| **Default Working Directory** | Default directory for all new Codex threads, used when you don't pick a folder.                                                   |
| **Working Directory Root**    | Folder whose direct subfolders become the working directory choices in New Thread with Prompt (for example, ~/projects or ~/dev). |
| **Terminal App**              | Terminal that Resume in Terminal opens: Terminal, Ghostty (1.3 or later), or iTerm2.                                              |
| **Codex CLI Path**            | Path to the Codex CLI binary. Leave blank to auto-detect using the search order above.                                            |

## Contributing

**Via Raycast (recommended):**

1. Use the "Fork Extension" action in Raycast's root search
2. Run `npm install && npm run dev` from the extension folder

When submitting changes, add yourself to contributors in `package.json` and update `CHANGELOG.md`.
