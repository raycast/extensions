# Codex

Monitor and manage your Codex tasks directly from Raycast.

## Commands

### Search Threads

Browse active and archived Codex threads updated in the last 30 days. Search by name, working directory, preview text, or full transcript text.

- Threads waiting on your approval or input are grouped at the top.
- Each thread shows its working directory, git branch and commit, status, and subagent count.
- **Resume** in the Codex app, or in your terminal with the `codex resume` command.
- **Summarize** a thread, then copy or paste the result, or **auto-rename** it with Raycast AI. You can also rename the last 5 to 50 threads in one pass.
- **Fork**, **archive**, and **unarchive** threads.
- **Export** a thread to Markdown, saved to your Downloads folder.
- **Copy** a thread's ID, resume command, working directory, deeplink, or last message.

### New Thread

Start a new thread in your default working directory.

### New Thread with Prompt

Start a thread with a typed prompt and a working-directory picker. The picker lists subfolders from your Working Directory Root, with recent thread counts when available, plus a Choose Folder option with a native folder chooser.

### New Thread from Clipboard

Start a thread using clipboard text as the prompt. It uses the Default Working Directory preference when configured. With no preference configured, it falls back to the app's default.

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
3. `/opt/homebrew/bin/codex` (Homebrew on Apple Silicon)
4. `/usr/local/bin/codex` (Homebrew on Intel)
5. Your login shell (`command -v codex`)

If none match, set the path manually in the **Codex CLI Path** preference.

## Preferences

| Preference                    | Description                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| **Default Working Directory** | Folder new threads start in when you don't pick one. Used by all New Thread commands.              |
| **Working Directory Root**    | Parent folder whose direct subfolders are offered as Working Directory choices.                    |
| **Codex CLI Path**            | Path to the Codex CLI. Leave empty to auto-detect.                                                 |

## FAQ

### Can it move a thread into a desktop Project?

No. Resuming a thread keeps its working directory, but Codex manages desktop Project membership itself, and its public interfaces don't let an extension create a Project or assign a thread to one.

### Does the extension store my conversations?

No. Transcript search runs through the local Codex app server, and the extension keeps no separate copy of your transcripts.

---

_Codex is an unofficial extension and is not affiliated with or endorsed by OpenAI._
