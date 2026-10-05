# PromptCast for Claude & Codex

Send prompts, manage sessions, and control Codex CLI and Claude Code directly from Raycast. PromptCast keeps the real CLI terminal visible, streams output in real time, indexes local history, and provides focused controls for models, permissions, usage, MCP servers, and skills.

PromptCast is an independent community extension and is not affiliated with or endorsed by Anthropic or OpenAI. Claude and Codex are trademarks of their respective owners.

## Why PromptCast

PromptCast goes beyond searching saved conversations. It opens the real interactive Claude Code or Codex CLI in a shared PTY, controls the live process from Raycast and a supported terminal or editor, and combines session history with startup settings, permissions, models, usage, MCP servers, and skills in one workflow.

## Requirements

- macOS and Raycast.
- Claude Code and/or Codex CLI installed and authenticated.
- `tmux` is recommended for controlling the same live terminal from Raycast and another application.
- Zed integration uses Zed's installed CLI and Terminal Threads. macOS may request Accessibility permission the first time Raycast starts a thread automatically.

The extension reads existing local data. It does not require an API key or send conversation files to another service.

## Commands

| Command                           | Purpose                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| **Browse Claude and Codex Chats** | Browse favorites, live sessions, projects, and complete local history.              |
| **View Claude and Codex Usage**   | View plans, remaining limits, reset times, credits, and available token statistics. |
| **Show Claude and Codex Usage**   | Keep selected active limits visible in the macOS menu bar.                          |
| **Manage MCP Servers**            | Inspect and manage MCP servers for either CLI.                                      |
| **Manage CLI Skills**             | Inspect project, user, plugin, and managed skills.                                  |

## Conversation Home

The initial view stays intentionally small:

1. Favorite chats.
2. One representative conversation per favorite project.
3. Live sessions.
4. A single entry for the complete history.

History is grouped by date and can be searched by title, alias, project, path, provider, content, or session ID. Chat renames are local Raycast aliases and never modify the original JSONL files. Session IDs are deduplicated while distinct conversations with the same title remain available.

## Live Terminal

Opening an idle conversation first shows one native startup form. Choose the permission profile, model, reasoning effort, and Fast mode before the PTY is created, then start the CLI at full width. The same saved selection is used when the conversation is opened in Raycast, Zed, or another supported terminal. An already-running shared conversation opens directly without showing the form or interrupting it. **Extras → Startup Settings** keeps every startup option available while a chat is live and saves changes for its next start without modifying the current process.

Press `⌘ ↵` to reveal the compact options view, write in the top bar, and press `↵` once to send. Press `⌘ ↵` again to return to the full terminal.

The terminal combines a memory-safe window of the stored transcript with the active PTY, preserves ANSI colors and the cursor, and keeps the latest output in view unless you intentionally scroll back. PromptCast never rewrites the source JSONL: exceptionally large histories are read from their head and tail so Raycast stays within its 100 MB command heap.

Codex resumes with the selected permission profile, a model and effort validated against the local Codex model cache, service tier, personality, answer verbosity, reasoning summary, and original session ID. Claude resumes with its selected permission mode, model, effort, Fast mode, output style, transcript view, and original session ID. New conversations use safeguarded defaults:

```bash
codex --sandbox workspace-write --ask-for-approval on-request -m MODEL -c model_reasoning_effort=EFFORT -c service_tier=flex -c model_verbosity=high -c model_reasoning_summary=auto resume SESSION_ID
claude --model MODEL --settings '{"fastMode":false}' --resume SESSION_ID
```

YOLO and bypass modes remain available through the permission selector, require an explicit warning confirmation, and are never selected automatically for a conversation. Codex YOLO maps to the current stable `--dangerously-bypass-approvals-and-sandbox` CLI flag. Model, effort, Codex Fast mode, and permissions can still be changed live from the chat without restarting Raycast; the last successful model and Fast selection becomes the next startup default.

## Keyboard Shortcuts

Open **Chat → Extras → Keyboard Shortcuts** or the selected conversation's Action Panel to edit, disable, or restore any extension-defined shortcut. Changes are stored locally and apply to the full terminal, the options view, conversation lists, usage, MCPs, skills, and the menu bar. The two Raycast-native shortcuts, `↵` for the primary action and `⌘K` for the Action Panel, cannot be overridden by an extension.

### Chat

| Default       | Action                                                                            |
| ------------- | --------------------------------------------------------------------------------- |
| `⌘↵`          | Toggle the full terminal and chat options.                                        |
| `⌘⌫`          | Delete one top-bar character, or send Backspace to the CLI when the bar is empty. |
| `⌘⇧↑` / `⌘⇧↓` | Scroll through the rendered terminal history in either view.                      |
| `⌘⇧←` / `⌘⇧→` | Recall the previous or next prompt from the real CLI composer history.            |
| `⌘+` / `⌘-`   | Increase or decrease terminal text size.                                          |
| `⌘0`          | Restore the enlarged default text size.                                           |
| `⌘⇧V`         | Paste an image from the clipboard into the CLI composer.                          |
| `⌘/`          | Open the slash-command palette.                                                   |
| `⌘M`          | Change model, effort, and Codex Fast mode.                                        |
| `⌘⇧P`         | Change the permission profile or open the native permissions selector.            |
| `⌘U`          | Open the usage viewer.                                                            |
| `⌘⇧O`         | Open or connect the session in the selected terminal or editor.                   |
| `⌘⇧X`         | End the live chat and close its shared process.                                   |
| `⌘⇧H`         | Open the complete in-app shortcut and usage guide.                                |

### Native CLI Keys

| Default     | Terminal key     |
| ----------- | ---------------- |
| `⌘1` / `⌘2` | Up / Down.       |
| `⌘3` / `⌘4` | Left / Right.    |
| `⌘5`        | Enter / confirm. |
| `⌘6`        | Tab.             |
| `⌘⇧Esc`     | Escape.          |
| `⌘8` / `⌘9` | Ctrl-C / Ctrl-D. |

### Conversation Lists and Managers

| Default | Action                                                                   |
| ------- | ------------------------------------------------------------------------ |
| `⌘⇧R`   | Rename the selected chat locally.                                        |
| `⌘⇧M`   | Manage MCP servers for the selected project.                             |
| `⌘D`    | Manage skills for the selected project.                                  |
| `⌘⇧F`   | Add or remove the selected chat from favorites.                          |
| `⌘⌥F`   | Add or remove the selected project from favorites.                       |
| `⌘⇧P`   | Configure CLI startup for the selected conversation.                     |
| `⌘N`    | Add an MCP server.                                                       |
| `⌘R`    | Refresh the current conversations, usage, MCP, skills, or menu-bar view. |
| `⌘C`    | Copy the selected usage summary.                                         |

## Shared Sessions

When `tmux` is available, Raycast creates or joins one shared session per conversation. Raycast and an external terminal then control the same TUI, so prompts and responses appear in both places immediately.

Shared sessions keep up to 50,000 terminal lines and enable `tmux` mouse mode. In Zed, VS Code, Warp, and terminal applications, use the trackpad or mouse wheel to browse the transcript. Keyboard-only navigation is also available with `Ctrl-B`, then `[`, followed by arrows or Page Up/Page Down; press `q` to return to the live prompt.

A CLI that was already opened directly in another application owns a private PTY. macOS does not provide a safe way for Raycast to capture that existing PTY. To migrate it:

1. Exit only the active Claude or Codex process in the other application.
2. Open the conversation in Raycast and choose **Start Shared Mode**.
3. Choose **Start and Open In…** to connect the preferred terminal or editor to the same session.

The extension refuses to start a second writer while the private process is still active because concurrent resume processes can corrupt or duplicate history.

## Editor Integration

When Zed is selected as the preferred application, the extension:

1. Reuses the existing Zed window and switches it to the exact selected project instead of merging it into the current worktree.
2. Creates a Terminal Thread in Zed's Threads Sidebar.
3. Starts the shared command inside that Terminal Thread, grouped with the project.

If macOS blocks UI automation, Zed still switches to the selected project and the exact command remains in the clipboard for a one-time manual paste. A Terminal Thread preserves the native Claude or Codex CLI experience; it is not a Zed Agent thread and cannot attach to a private terminal that was already running.

Visual Studio Code, Cursor, and Windsurf open the exact workspace through their bundled CLI, reveal the integrated terminal, and submit the shared command there. The in-chat **Terminal or Editor** picker only lists compatible applications that are installed on the Mac.

## Models and Permissions

- Codex models and supported effort levels come from the local `models_cache.json` generated by Codex CLI.
- Codex Fast mode is only offered for models whose local service-tier metadata supports it; disabling it uses the supported `flex` tier.
- Codex startup settings include `personality`, `model_verbosity`, and `model_reasoning_summary`.
- Claude startup settings include model, effort, Fast mode, output style, and transcript view. Claude Fast mode can use extra paid usage and may switch to a compatible Opus model.
- Codex profiles include YOLO, full access with approval, workspace write, and read-only modes.
- Claude profiles include `bypassPermissions`, `acceptEdits`, `auto`, the CLI default, `dontAsk`, and `plan`.

YOLO and `bypassPermissions` remove important safeguards. A CLI launched with either profile can execute commands and modify or delete files with the permissions of the current macOS user.

## Usage, MCPs, and Skills

The usage viewer queries the local interfaces exposed by the installed CLIs and caches valid results for five minutes. The menu-bar command uses the original provider icons and can show Claude, Codex, the most restrictive provider, or both providers with a compact dual-logo mark. It independently configures the automatic/short-term/weekly limit, remaining/used percentage, and whether the bar shows the percentage, reset time, or both. Reset values are shown as compact text without clock glyphs, and the two providers use spacing instead of divider bars. Its menu also exposes compact submenus for favorite and live chats.

MCP management hides environment-variable values, headers, and tokens. Skills management reads user, project, plugin, and managed definitions and only writes settings supported by the corresponding CLI.

## Preferences

- **Claude Data Folder**: optional override for `CLAUDE_CONFIG_DIR` or `~/.claude`.
- **Codex Data Folder**: optional override for `CODEX_HOME` or `~/.codex`.

PromptCast uses a single US English interface. Keyboard shortcuts are configured from the conversation Action Panel or **Chat → Extras → Keyboard Shortcuts**, where every extension-defined action can be edited, disabled, and restored independently.

**Terminal or Editor** inside a conversation is the single application selector. It lists only installed compatible apps, stores the selection locally, and updates every open PromptCast view immediately. Terminal is used until another application is selected and whenever a stored application is no longer installed.

## Privacy

Conversation discovery, aliases, favorites, usage cache, and transcript rendering stay local to Raycast, `~/.claude`, and `~/.codex`. Claude Code and Codex CLI continue to communicate with their own providers according to their existing authentication and configuration.

## Development

```bash
npm install
npm run lint
npm run build
npm run dev
```

PromptCast loads native PTY files from `assets/node-pty` for Apple Silicon and Intel. For Store publication, a Raycast team member independently adds those files from the declared `node-pty@1.1.0` npm dependency. Their npm source, package integrity, and per-file SHA-256 hashes are documented in [PUBLISHING.md](PUBLISHING.md).
