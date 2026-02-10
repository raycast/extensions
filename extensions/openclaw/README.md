# OpenClaw for Raycast

Chat with your local [OpenClaw](https://github.com/openclaw/openclaw) AI assistant directly from Raycast.

## Features

- **Ask OpenClaw** - Quick question and answer
- **Chat with OpenClaw** - Persistent conversations with history
- **Ask About Clipboard** - Analyze clipboard content with custom prompts
- **Process Selected Text** - Summarize, explain, translate, fix grammar, and more

## Requirements

- [OpenClaw](https://github.com/openclaw/openclaw) installed and running locally
- OpenClaw Gateway with HTTP API enabled

## Setup

### 1. Enable the OpenClaw HTTP API

Add this to your `~/.openclaw/openclaw.json`:

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

### 2. Find Your API Token

Your token is in `~/.openclaw/openclaw.json` under `gateway.auth.token`:

```bash
cat ~/.openclaw/openclaw.json | grep -A 2 '"auth"' | grep token
```

### 3. Choose Your Connection Method

When you first run a command, Raycast will prompt for your API Endpoint and Token. The endpoint depends on where OpenClaw is running relative to Raycast:

#### Option A: Same Machine (Local)

**Use when:** Raycast and OpenClaw are on the same computer.

| Setting | Value |
|---------|-------|
| API Endpoint | `http://127.0.0.1:18789` |

This is the default - no configuration changes needed on OpenClaw.

---

#### Option B: Local Network (Same WiFi/LAN)

**Use when:** OpenClaw runs on another computer on your home/office network.

| Setting | Value |
|---------|-------|
| API Endpoint | `http://<openclaw-machine-ip>:18789` |

**Setup required on the OpenClaw machine:**

1. Find the machine's local IP:
   ```bash
   ipconfig getifaddr en0   # WiFi
   # or
   ipconfig getifaddr en1   # Ethernet
   ```

2. Edit `~/.openclaw/openclaw.json` and change the gateway bind setting:
   ```json
   {
     "gateway": {
       "bind": "0.0.0.0"
     }
   }
   ```

3. Restart OpenClaw gateway for changes to take effect.

4. Use the local IP as your endpoint, e.g., `http://192.168.1.50:18789`

> **⚠️ Security Warning:** Binding to `0.0.0.0` exposes the gateway to your entire local network. Risks include:
> - Anyone on the same WiFi can attempt connections
> - Public WiFi = public exposure
> - If port forwarding is enabled on your router, it could be internet-accessible
>
> The token provides some protection, but **Tailscale (Option C) is strongly recommended** for accessing OpenClaw from other machines. Only use this option on trusted private networks.

---

#### Option C: Remote via Tailscale (Recommended for Remote Access)

**Use when:** You want secure access from anywhere - home, office, mobile, etc.

| Setting | Value |
|---------|-------|
| API Endpoint | `https://<machine-name>.<tailnet>.ts.net` |

**Setup required on the OpenClaw machine:**

1. Install [Tailscale](https://tailscale.com) on both machines and sign in to the same account.

2. On the OpenClaw machine, set up Tailscale serve:
   ```bash
   tailscale serve --bg 18789
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

### Ask OpenClaw
Quick Q&A - type a question, get an answer. Supports passing a question as an argument for automation.

### Chat with OpenClaw
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
Make sure OpenClaw gateway is running:
```bash
openclaw gateway status
```

### Token errors
Verify your token matches `gateway.auth.token` in your OpenClaw config.

## Acknowledgments

Thanks to [@asaphko](https://github.com/asaphko) for the original extension icon and inspiration for the Gateway Status and Open Webchat commands.
