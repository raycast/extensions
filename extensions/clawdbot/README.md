# Clawdbot for Raycast

Chat with your local [Clawdbot](https://clawd.bot) AI assistant directly from Raycast.

## Features

- **Ask Clawdbot** - Quick question and answer
- **Chat with Clawdbot** - Persistent conversations with history
- **Ask About Clipboard** - Analyze clipboard content with custom prompts
- **Process Selected Text** - Summarize, explain, translate, fix grammar, and more

## Requirements

- [Clawdbot](https://clawd.bot) installed and running locally
- Clawdbot Gateway with HTTP API enabled

## Setup

### 1. Enable the Clawdbot HTTP API

Add this to your `~/.clawdbot/clawdbot.json`:

```json
{
  "gateway": {
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": true
        }
      }
    }
  }
}
```

The gateway will hot-reload the config automatically.

### 2. Get Your API Token

Your gateway token is in `~/.clawdbot/clawdbot.json` under `gateway.auth.token`.

### 3. Configure the Extension

When you first run a command, Raycast will prompt for:

| Setting | Default | Description |
|---------|---------|-------------|
| API Endpoint | `http://127.0.0.1:18789` | Your Clawdbot gateway URL |
| API Token | (required) | Your gateway auth token |
| Agent ID | `main` | Which Clawdbot agent to use |

## Commands

### Ask Clawdbot
Quick Q&A - type a question, get an answer. Supports passing a question as an argument for automation.

### Chat with Clawdbot
Full conversation interface with:
- Persistent chat history
- Multiple conversations
- Streaming responses
- Newest messages shown first

### Ask About Clipboard
Reads your clipboard and lets you ask questions about it. Great for:
- Explaining code snippets
- Summarizing copied text
- Translating content

### Process Selected Text
Select text in any app, then run this command to:
- Explain
- Summarize
- Fix Grammar
- Improve Writing
- Simplify
- Expand
- Translate to English
- Explain Code
- Review Code
- Make Bullet Points

**Tip:** Assign a keyboard shortcut in Raycast preferences for quick access.

## Troubleshooting

### "API error: 405 - Method Not Allowed"
The HTTP API endpoint isn't enabled. Add the config shown in Setup step 1.

### "Failed to connect"
Make sure Clawdbot gateway is running:
```bash
clawdbot gateway status
```

### Token errors
Verify your token matches `gateway.auth.token` in your Clawdbot config.
