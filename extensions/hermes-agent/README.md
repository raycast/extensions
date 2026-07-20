# Hermes Agent for Raycast

Chat with your local [Hermes Agent](https://github.com/nousresearch/hermes-agent) AI assistant directly from Raycast.

## Features

- **Ask Hermes** - Quick question and answer
- **Chat with Hermes** - Persistent conversations with history
- **Ask About Clipboard** - Analyze clipboard content with custom prompts
- **Process Selected Text** - Summarize, explain, translate, fix grammar, and more

## Requirements

- [Hermes Agent](https://github.com/nousresearch/hermes-agent) installed and running locally
- Hermes API Server enabled

## Setup

### 1. Enable the Hermes API Server

Set the following environment variables:

```bash
export API_SERVER_ENABLED=true
export API_SERVER_KEY=your-secret-token-here
```

Or configure via CLI:

```bash
hermes config set api_server.enabled true
hermes config set api_server.key your-secret-token-here
```

The API server will hot-reload the config automatically.

### 2. Find Your API Token

Your token is the value you set for `API_SERVER_KEY` environment variable or in your Hermes configuration.

### 3. Choose Your Connection Method

When you first run a command, Raycast will prompt for your API Endpoint and Token. The endpoint depends on where Hermes is running relative to Raycast:

#### Option A: Same Machine (Local)

**Use when:** Raycast and Hermes Agent are on the same computer.

| Setting | Value |
|---------|-------|
| API Endpoint | `http://127.0.0.1:8642` |

This is the default - no configuration changes needed on Hermes.

---

#### Option B: Local Network (Same WiFi/LAN)

**Use when:** Hermes runs on another computer on your home/office network.

| Setting | Value |
|---------|-------|
| API Endpoint | `http://<hermes-machine-ip>:8642` |

**Setup required on the Hermes machine:**

1. Find the machine's local IP:
   ```bash
   ipconfig getifaddr en0   # WiFi
   # or
   ipconfig getifaddr en1   # Ethernet
   ```

2. Set the API server host to `0.0.0.0`:
   ```bash
   export API_SERVER_HOST=0.0.0.0
   ```

3. Restart Hermes API server for changes to take effect.

4. Use the local IP as your endpoint, e.g., `http://192.168.1.50:8642`

> **⚠️ Security Warning:** Binding to `0.0.0.0` exposes the API server to your entire local network. Risks include:
> - Anyone on the same WiFi can attempt connections
> - Public WiFi = public exposure
> - If port forwarding is enabled on your router, it could be internet-accessible
>
> The token provides some protection, but **Tailscale (Option C) is strongly recommended** for accessing Hermes from other machines. Only use this option on trusted private networks.

---

#### Option C: Remote via Tailscale (Recommended for Remote Access)

**Use when:** You want secure access from anywhere - home, office, mobile, etc.

| Setting | Value |
|---------|-------|
| API Endpoint | `https://<machine-name>.<tailnet>.ts.net` |

**Setup required on the Hermes machine:**

1. Install [Tailscale](https://tailscale.com) on both machines and sign in to the same account.

2. On the Hermes machine, set up Tailscale serve:
   ```bash
   tailscale serve --bg 8642
   ```

3. Get your serve URL:
   ```bash
   tailscale serve status
   ```
   Output: `https://machine-name.tailca3a37.ts.net`

4. Use that URL as your API Endpoint.

**Benefits:**
- Encrypted connection (HTTPS)
- Works from anywhere (coffee shop, mobile hotspot, etc.)
- Only accessible to devices on your Tailscale network
- No need to open firewall ports

---

#### Connection Method Comparison

| Method | Security | Works Remotely | Setup Complexity | Recommended |
|--------|----------|----------------|------------------|-------------|
| Local | High (localhost only) | No | None | ✅ Yes |
| Local Network | ⚠️ Low (LAN exposure) | No | Low | Only on trusted networks |
| Tailscale | High (encrypted, private) | Yes | Medium | ✅ Yes - best for remote |

## Commands

### Ask Hermes
Quick Q&A - type a question, get an answer. Supports passing a question as an argument for automation.

### Chat with Hermes
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
The API server endpoint isn't enabled. Set `API_SERVER_ENABLED=true` and restart Hermes.

### "Failed to connect"
Make sure Hermes API server is running:
```bash
hermes status
```

### Token errors
Verify your token matches the `API_SERVER_KEY` environment variable or Hermes config.

## Acknowledgments

Thanks to [@asaphko](https://github.com/asaphko) for the original extension icon and inspiration for the API Server Status and Open Webchat commands. This extension is inspired by the [OpenClaw Raycast plugin](https://github.com/openclaw/openclaw).
