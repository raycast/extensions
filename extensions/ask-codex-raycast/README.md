# Codex in Raycast

Continue a conversation with your already signed-in local Codex CLI directly inside Raycast. This extension is a native chat surface: it streams replies, sends follow-ups and steering instructions, and offers the model/effort combinations returned by your local CLI.

## First-run setup

Before chat opens, complete the native two-step setup:

1. Check the local CLI connection. The extension initializes `codex app-server`, reads `account/read` without refreshing tokens, and loads `model/list`. If the active provider requires OpenAI authentication, you must already be signed in. Custom providers that do not require OpenAI authentication are supported.
2. Choose a model and an effort level from the CLI catalog, then save. A previous valid choice is prefilled; models without an adjustable effort level say so.

The check sends no inference request and cannot guarantee model entitlement, provider credentials, quota, or network availability for the next answer. Failures keep setup open with retry and CLI preference actions. No chat thread or launch-argument message is started until setup has been saved. Changing connection preferences requires setup again. Existing conversations and completed setup records are preserved across updates.

Use **Actions → CLI and Default Model** to reopen setup, and **Actions → Open Settings** for CLI path, directory, sandbox, and web-search preferences. The extension interface uses US English, following the [repository localization policy](https://github.com/raycast/extensions/blob/main/.github/copilot-instructions.md#6-localization). Model replies can use the language you request; saved message content is not translated or rewritten.

## Chat

- Open **Codex in Raycast**, or use it as a fallback for a question typed in Root Search.
- Replies always stay in a full-width native Markdown reader, with no chat sidebar or placeholder list item.
- Press **Enter** to open the native floating message composer. Type in its input field and press **Enter** to send; there is no Command+Enter requirement. While an answer is running, the same composer sends steering instructions to that turn.
- Raycast closes the action popover after sending. The conversation stays on the same full-width page and streams immediately; press Enter to compose the next message without choosing a conversation or opening another page.
- Searching, command execution, tool use, and interrupted/failed turn states remain visible during chat; healthy idle status does not add a persistent banner.
- Markdown, code, tables, LaTeX and speaker avatars are retained, with the newest messages first. Typing into the composer does not re-render the entire transcript.
- Model, effort level, and New Chat are directly below the message action, also inside the floating composer. Model and effort have separate native pickers; highlight **Effort Level** and press **Enter** to open the supported levels. Use **Up/Down** to select and **Enter** to confirm; the current level is selected when the list opens. Switching model preserves the effort when supported, otherwise uses that model's supported default.
- Choose an actual CLI model/effort combination from **Actions → Model** or **Cmd/Ctrl+M**. Choices are remembered and apply to the next response; steering retains the current turn's model.
- **Cmd/Ctrl+N** creates a conversation; **Cmd/Ctrl+.** stops a reply; **Cmd/Ctrl+C** copies the latest answer; **Cmd/Ctrl+Shift+C** copies the conversation.
- **Recent Chats** opens an explicit short switcher for up to 12 chats stored by this extension. Conversation input does not search history.

## Drafts and native controls

If a saved server thread cannot be resumed, the replacement conversation keeps the unsent draft and the old local record is retained. Resumed streaming updates reuse server item identities so partial replies are updated instead of duplicated.

The floating composer uses Raycast's native action-menu input with filtering disabled. Its section label previews the message that will be sent. A late acknowledgement from an earlier send cannot clear a newer message typed into the reopened composer. Closing the menu preserves the last non-empty draft; reopening offers **Send Saved Draft**. Because the public submenu API cannot programmatically fill its search field, use the offered copy action and paste to edit a restored draft, or type replacement text. **Clear Draft** explicitly discards it. A visibly empty new input never silently sends an old draft.

The extension uses native controls rather than custom HTML/CSS or a separate app. Raycast's public full-width Detail has no permanent top input or top model dropdown, so the accepted design uses the floating composer and native Actions model selector. The native action input retains Raycast's built-in search placeholder; filtering is disabled and its contents are treated as a message.

## Requirements and preferences

Install and sign in to the official [Codex CLI](https://github.com/openai/codex#installation) first. The extension automatically searches common macOS and Windows executable locations; set **Codex Path** when installed elsewhere. It uses `codex app-server` over local stdin/stdout, without an extension-owned service, bundled credentials, a CLI download, or an API-key preference.

| Preference        | Behavior                                                                     |
| ----------------- | ---------------------------------------------------------------------------- |
| Codex Path        | Optional executable override, including Windows `.exe`/`.cmd` installations. |
| Working Directory | Optional absolute directory for repository-aware questions.                  |
| Web Search        | Allow the CLI to use live web search when enabled.                           |
| Sandbox Mode      | Read-only by default; workspace-write/full access are explicit choices.      |

Interactive tool approval requests are rejected because this native chat does not expose an approval interface. Codex's existing authentication, networking, and account limits still apply.

## Scope

Global CLI thread search, transcript export, rename/archive/restore management, projects, MCP administration, and usage dashboards are outside this extension's UI. The existing [Codex extension by asifk](https://www.raycast.com/asifk/codex) already covers thread management and opening the desktop app/terminal. The purpose here is to stay in Raycast while sending prompts and reading live replies.

Existing Raycast-local history and model-selection storage keys are preserved through the display-name change. Removing management controls does not delete old local records or underlying Codex sessions. The earlier optional independent-window integration and its preferences have been removed.
