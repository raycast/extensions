# Agent Client Protocol

Connect to AI agents via Agent Client Protocol for coding assistance directly from Raycast.

## Setup

### 1. Install an ACP-compatible agent

This extension works with any agent that supports the Agent Client Protocol:

- **[Claude Code](https://www.npmjs.com/package/@agentclientprotocol/claude-agent-acp)** - Anthropic's official CLI (recommended), via `npm install -g @agentclientprotocol/claude-agent-acp`
- **[Gemini CLI](https://github.com/google-gemini/gemini-cli)** - Google's AI assistant
- **Custom agents** - Any tool implementing the [ACP specification](https://agentclientprotocol.com)

Follow the installation instructions from the agent's official documentation.

### 2. Configure the agent in Raycast

1. Open **Configure Agents** command
2. Select a built-in agent or create a custom configuration
3. Fill in the required fields:
   - **Command**: Path to the agent binary (e.g., `claude-agent-acp`)
   - **Arguments**: Any required arguments (e.g., `--experimental-acp` for Gemini)
   - **Environment Variables**: API keys and other variables in JSON format
   - **Additional PATH**: Add directories to PATH if needed

### 3. Start chatting

Use the **Ask AI Agent** command to start a conversation.

## Troubleshooting

**Exit code 127**: The agent binary cannot be found.
- Use the absolute path to the binary in the **Command** field
- Or add the binary's directory to **Additional PATH**

**"Agent is not signed in"**: The agent connected but rejected the prompt with
`Authentication required`. Use the **Open Login in Terminal** action on the error toast,
complete the login, then send the message again. Alternatively, put a token into the
agent's **Environment Variables** — for `claude-agent-acp` that is
`CLAUDE_CODE_OAUTH_TOKEN` (create one with `claude setup-token`) or `ANTHROPIC_API_KEY`.

Note that **Additional PATH** only adds to the PATH the agent gets; the standard system
directories are always included, because agents shell out to tools like `/usr/bin/security`
to read their stored logins.

**Connection issues**: Enable logging in extension preferences to debug. The agent's own
stderr is included in the extension log.

## Commands

- **Ask AI Agent** - Start a new conversation
- **View Conversations** - Browse past conversations
- **Configure Agents** - Manage agent configurations

