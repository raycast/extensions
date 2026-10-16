# Codex in Raycast

Continue a conversation with your already signed-in local Codex CLI directly inside Raycast. This extension is a native chat surface: it streams replies, sends follow-ups and steering instructions, and offers the model/effort combinations returned by your local CLI.

## Chat

- Open **Codex in Raycast**, or use it as a fallback for a question typed in Root Search.
- Replies always stay in a full-width native Markdown reader, with no chat sidebar or placeholder list item.
- Press **Enter** to open the native floating message composer. Type in its input field and press **Enter** to send; there is no Command+Enter requirement. While an answer is running, the same composer sends steering instructions to that turn.
- Raycast closes the action popover after sending. The conversation stays on the same full-width page and streams immediately; press Enter to compose the next message without choosing a conversation or opening another page.
- Markdown, code, tables, LaTeX and speaker avatars are retained, with the newest messages first. Typing into the composer does not re-render the entire transcript.
- Choose an actual CLI model/effort combination from **Actions → 模型** or **Cmd/Ctrl+M**. Choices are remembered and apply to the next response; steering retains the current turn's model.
- **Cmd/Ctrl+N** creates a conversation; **Cmd/Ctrl+.** stops a reply; **Cmd/Ctrl+C** copies the latest answer; **Cmd/Ctrl+Shift+C** copies the conversation.
- **最近对话** opens an explicit short switcher for up to 12 chats stored by this extension. Conversation input does not search history.

## Drafts and native controls

If a saved server thread cannot be resumed, the replacement conversation keeps the unsent draft and the old local record is retained. Resumed streaming updates reuse server item identities so partial replies are updated instead of duplicated.

The floating composer uses Raycast's native action-menu input with filtering disabled. Its section label previews the message that will be sent. Closing the menu preserves the last non-empty draft; reopening offers **发送已保存的草稿**. Because the public submenu API cannot programmatically fill its search field, use the offered copy action and paste to edit a restored draft, or type replacement text. **清空草稿** explicitly discards it. A visibly empty new input never silently sends an old draft.

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

## 中文

本插件现名 **Codex in Raycast**，重点是在 Raycast 内持续和本机 Codex CLI 对话。回复页始终全宽，不再用 List.Item.Detail，左栏和灰色选中框已完全移除。

按 Enter 打开原生输入浮层，输入后 Enter 发送；回答中继续输入则发送补充要求。发送后浮层按 Raycast 惯例收起，回复在原页继续显示，再按 Enter 即可追问，不换页面或会话。Markdown、公式、头像、最新消息置顶保留；模型/档位通过 Actions → 模型或 Cmd/Ctrl+M 选择。

关闭浮层后草稿仍保留，重新打开可直接发送已保存草稿；需要编辑时可复制并粘贴到原生输入框。清空草稿是明确操作，空输入不会误发旧消息。

独立 App 入口、窗口设置和交接代码已删除。全局 CLI 会话检索、重命名、归档/恢复等重复管理功能已精简；最近对话仅从菜单打开，只列本插件的最近 12 个对话，原数据不会因改名而删除。
