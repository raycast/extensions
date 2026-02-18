# OpenClaw for Raycast

Chat with your local [OpenClaw](https://openclaw.org) AI assistant directly from Raycast.

## Features

- **Threaded Chat** — Full multi-turn conversation displayed as a scrollable thread
- **Streaming Responses** — See responses as they're generated in real-time
- **Stop Generation** — Cancel a response mid-stream
- **Copy Conversation** — Copy the entire chat thread to clipboard

## Setup

1. Install the extension in Raycast
2. Configure the **Gateway URL** (default: `http://127.0.0.1:18789`)
3. Optionally set an **Auth Token** if your gateway requires authentication
4. Optionally set an **Agent ID** and **Model**

## Preferences

| Preference | Description | Default | Required |
|---|---|---|---|
| Gateway URL | URL of your OpenClaw Gateway | `http://127.0.0.1:18789` | Yes |
| Auth Token | Bearer token for authentication | — | No |
| Agent ID | OpenClaw agent to use | `main` | No |
| Model | Model identifier | `openclaw` | No |

## Usage

1. Open Raycast and search for **"Chat with OpenClaw"**
2. Press Enter to open the message input
3. Type your message and press Enter to send
4. The response streams in real-time
5. Press Enter again to send a follow-up message
6. Use ⌘⇧Delete to clear the conversation

## Development

```bash
npm install
npm run dev
```
