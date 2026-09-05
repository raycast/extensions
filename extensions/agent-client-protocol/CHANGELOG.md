# Agent Client Protocol Changelog

## [Catch Up With the Current ACP Spec] - {PR_MERGE_DATE}

### Fixed

- **Agents could not reach their own credentials**: Raycast runs extensions with no `USER`/`LOGNAME` and a `PATH` that contains only the configured "Additional PATH Directories", and that environment was passed straight to the agent. On macOS the Claude CLI reads its keychain login via `/usr/bin/security -a $USER`, so it reported "not logged in" and rejected every prompt with `Authentication required` even for signed-in users. Agents now start with the system locations on `PATH` and a resolved user identity
- **Protocol version mismatch**: Migrated from the deprecated `@zed-industries/agent-client-protocol` to its successor `@agentclientprotocol/sdk`. The old schema rejected `usage_update` notifications from current agents with `Invalid params`, and it surfaced agent errors as raw objects so every failure read `Unknown error`
- **Streaming during the first turn**: The session is now stored and observed before the opening prompt is sent, instead of after the whole turn finished. Updates no longer land in the "session not found" buffer
- **Authentication**: The client now advertises the `auth.terminal` capability, so agents actually offer their login methods, and an `Authentication required` rejection shows an actionable "Open Login in Terminal" error instead of a generic protocol error
- **Switching the agent mode**: `session/set_mode` and `session/cancel` were sent through a private field of the old SDK's connection object that no longer exists; both now use the SDK's public API. The new mode is also applied locally, because agents may acknowledge the switch without sending a `current_mode_update` notification
- **Claude Code agent**: Points at the maintained `claude-agent-acp` adapter; Zed's `claude-code-acp` was archived. Stored configurations are migrated automatically

- **Message order**: Streaming chunks were merged back into the agent's first message no matter how many tool calls had been recorded behind it, so the final answer appeared above the tool calls it was based on. Chunks now only extend a message while it is still the last one
- **Slash-command catalogue in the transcript**: The agent's `available_commands_update` was rendered as a system message right after the session opened, pushing the first answer down the list. It is stored on the session only

### Added

- **Agent mode before the first message**: Modes an agent reports are remembered per agent, selectable as a default in *Configure Agents* and overridable per chat in the *Ask AI Agent* form. The mode is applied between opening the session and the first prompt, so the opening turn no longer runs under the agent's default and triggers permission prompts
- **Tool calls are hidden by default** in the conversation, with a ⌘T toggle to show them
- Agent `stderr` is included in the extension log, so failures inside the agent are visible
- Context-window usage and session cost reported by the agent are stored with the conversation

## [Initial Version] - 2025-11-03

### Added

- **Core ACP Client Implementation**: Full Agent Client Protocol support with subprocess-based agent connections, proper process management, and lifecycle handling
- **Interactive Chat Interface**: Rich list-based UI with real-time streaming responses, message history, and follow-up conversation support
- **Built-in Agent Support**: Pre-configured agents including Claude Code and Gemini CLI
- **Custom Agent Configuration**: Ability to add and manage custom ACP-compatible agents
- **Session Management**: Conversation persistence, context sharing between messages, and multi-turn interactions
- **File Operations**: Support for reading files, writing files, and editing files through ACP protocol with security controls
- **Terminal Integration**: Execute terminal commands through agents with proper output handling
- **Security Features**: File access controls with pattern blocking for sensitive files (.env, credentials, etc.), path validation, and size limits
- **Comprehensive Testing**: Unit tests, integration tests, and end-to-end tests for core functionality
- **Error Handling**: Robust error handling with user-friendly error messages and logging
- **Performance Monitoring**: Built-in performance logging and metrics tracking