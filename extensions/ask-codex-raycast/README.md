# Ask Codex CLI

Ask ChatGPT/OpenAI directly from Raycast through the Codex CLI that is already installed and signed in on your computer. Type a question in Raycast Root Search, choose **Ask Codex** as your first fallback command, and press Enter. The extension sends the existing search text immediately, streams the response, and keeps follow-up turns in the same Codex conversation.

The extension uses `codex app-server` over local standard input/output as the bridge to OpenAI's ChatGPT/Codex service. It does not implement a separate ChatGPT API client, ask you to paste an API key, include its own analytics, or send your data to an additional extension-owned server.

## Highlights

- Works from Raycast Root Search as a fallback command—no need to type the prompt twice.
- Persistent chat view that keeps the full conversation visible while composing and sending messages.
- Multi-turn follow-ups and in-flight steering in the same Codex thread.
- Separate searchable session management for active, archived, and local Codex sessions.
- Automatic Codex CLI path discovery on Windows and macOS, with a user-editable manual path override.
- A clear installation prompt and official installation link when Codex CLI cannot be found.
- Draft preservation, reconnect actions, copy actions, clickable links, and clear connection status.
- Optional live web search and configurable Codex sandbox mode.
- Uses the Codex CLI authentication already stored and managed by Codex on the local computer.

## Everyday Use

### Ask from Root Search

1. Open Raycast and type your question.
2. Move to **Ask Codex** in the fallback list and press Enter.
3. The existing Root Search text is submitted automatically and the answer streams into a full-width page.

For the fastest workflow, open Raycast Settings → Launcher → Fallback Commands and move **Ask Codex** to the first position.

### Continue or Steer

The search field stays available above the transcript. Type a message and press Enter to send it; if Codex is still responding, it is sent as steering. The transcript remains visible while you type and after each reply. Each launch reconnects to the last active conversation by default.

### Manage Sessions

Use the conversation menu at the top right or the action menu to open history or start a new chat. History can search and continue previous conversations, rename them, archive them, or restore archived entries. The local Codex session view reads compatible CLI, editor, and app-server sessions only when requested. Renaming and archiving are extension metadata operations and do not delete Codex's original local records.

## Windows and macOS

The same extension package declares support for both platforms.

- **Windows:** discovers `codex.exe`, `codex.cmd`, npm global installations, and common user installation locations. It also handles paths containing spaces and non-ASCII characters.
- **macOS:** discovers `codex` through Raycast's environment, the login shell, Homebrew locations for Apple Silicon and Intel Macs, and common user installation locations.
- **Both:** allow an explicit absolute executable path and working directory in preferences. Platform-specific path and command construction is covered by automated tests.

Windows has been exercised end to end with Root Search fallback submission, streaming replies, follow-ups, history, reconnecting, and session actions. macOS discovery and process behavior are implemented and covered by automated cross-platform tests; a Mac installation still requires Raycast, Node.js, and a signed-in Codex CLI on that Mac.

## Requirements

- Raycast with extension support for your platform.
- Node.js 22.22.2 or newer for local development.
- Codex CLI installed and signed in on the same computer.

Normally, **Codex Path** should remain empty so the extension can detect it automatically.

If automatic detection fails, the answer page explains that Codex CLI is missing and provides an **Install Codex CLI** action linking to the official instructions. If Codex is already installed in a custom location, open extension settings and enter its absolute path instead.

## Preferences

| Preference | Purpose |
| --- | --- |
| Web Search | Allows Codex to retrieve current web information. |
| Sandbox Mode | Chooses read-only, workspace-write, or full-access execution. Read-only is the default. |
| Working Directory | Gives Codex repository context for a particular folder. |
| Codex Path | Overrides automatic discovery with an absolute path to `codex`, `codex.exe`, or `codex.cmd`. |

The extension uses `approvalPolicy: never` because Raycast cannot present Codex's interactive terminal approval flow. Keep the default read-only sandbox for general questions. Use the regular Codex CLI for tasks that require interactive approvals or sensitive system changes.

## Privacy and Security

| Data | Handling |
| --- | --- |
| Codex sign-in | Managed by the locally installed Codex CLI; no credential is bundled in this extension. |
| Prompts and answers | Sent to the local Codex process and stored only in Codex's local session files and Raycast local storage as needed for the UI. |
| Drafts and session labels | Stored in Raycast local storage on the current computer. |
| Preferences | Stored through Raycast's preference system. |

The extension contains no hard-coded API keys, private keys, access tokens, custom telemetry, or extension-owned remote endpoint. The Store submission excludes dependencies, build output, logs, temporary work files, authentication files, and local conversation data. A pre-publication dependency audit and secret-pattern scan are run before submission.

## Development

```text
npm ci
npm test
npm run lint
npm run build
```

Run `npm run dev` to load the development extension in Raycast.

## 中文说明

Ask Codex CLI 通过本机已经登录的 Codex CLI 连接 ChatGPT/OpenAI 服务，并把 Raycast 根搜索里的文字直接交给它。它不是另一套要求你填写 API Key 的客户端，而是使用 `codex app-server` 作为本地连接桥梁。把 **Ask Codex** 设置为第一项 Fallback Command 后，平时只需打开 Raycast、输入问题、向下选择一次并回车；插件会自动使用刚才的搜索文字，无需进入页面后重新输入。

聊天页面会一直保留顶部输入框和完整对话记录。直接输入后按 Enter 发送；如果 Codex 正在生成，也可以继续输入并按 Enter 发送补充要求。每次打开 Ask Codex 默认自动连接上次活动会话。右上角会话菜单和操作菜单都能打开历史或新建对话；历史支持搜索、继续、重命名、归档和恢复，也可以按需读取本机 Codex 会话。

Windows 会自动寻找 `codex.exe`、`codex.cmd` 和常见 npm 安装位置；macOS 会检查登录 shell、Apple Silicon/Intel Homebrew 路径及常见用户目录。两边都支持用户在设置中修改 Codex 路径和工作目录。如果没有检测到 CLI，界面会明确提示安装官方 Codex CLI，并提供安装入口；已经安装在特殊目录时则可以直接填写绝对路径。插件不内置 API Key，也不会把你的登录文件、聊天记录或本地路径打包发布。

## Independent Project and Trademarks

This is an independent community extension and is not affiliated with or endorsed by OpenAI. Codex, ChatGPT, the Codex mark, and related OpenAI marks are property of OpenAI. The application icon is used only to identify compatibility with the Codex service and is not intended to imply sponsorship.

## Documentation

- [Codex App Server](https://developers.openai.com/codex/app-server)
- [Codex non-interactive mode](https://developers.openai.com/codex/non-interactive)
- [Raycast Fallback Commands](https://manual.raycast.com/fallback-commands)
- [Raycast extension preferences](https://developers.raycast.com/api-reference/preferences)
