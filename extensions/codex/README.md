# Codex

Monitor and manage your Codex tasks directly from Raycast.

## Commands

All **New Thread** commands default to ordinary **ChatGPT Chat**. Change **Default Chat Mode** to **Codex** to restore coding tasks and working-directory support. In Chat mode, working directories are ignored and the prompt form hides the directory picker. The desktop link prefills the composer; press Send to submit the message.

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

Open a new chat in the configured mode. Codex mode uses your default working directory.

### New Thread with Prompt

Start a chat with a typed prompt. In Codex mode, a working-directory picker lists subfolders from your Working Directory Root, with recent thread counts when available, plus a Choose Folder option with a native folder chooser.

### New Thread from Clipboard

Start a chat using clipboard text as the prompt. In Codex mode, it uses the Default Working Directory preference when configured.

### New Thread from Selected Text

Select text in the frontmost application and run this command to open a chat with that text as its prompt, without an intermediate form. In Codex mode it uses **Default Working Directory**, just like New Thread from Clipboard.

Assign a global hotkey in **Raycast Settings → Extensions → Codex → New Thread from Selected Text**, then select text in another application and press that hotkey. If no text is selected or the selection cannot be read, the command shows a message and does not open a thread. Clipboard text is not used as a fallback.

Set **Selected Text Prompt Prefix** in the extension preferences to prepend reusable instructions. The prompt is the prefix, a blank line, and the selected text. Leave the preference empty to use only the selection. This setting only affects the selected-text command. The current desktop deeplink initializes the composer; it does not automatically submit the message.

If selection reading fails, check Raycast's permission in **System Settings → Privacy & Security → Accessibility** and try selecting plain text in another application. Selection support depends on the source application.

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
