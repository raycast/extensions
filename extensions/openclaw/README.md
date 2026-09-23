# OpenClaw for Raycast

Monitor and chat with an [OpenClaw](https://github.com/openclaw/openclaw) Gateway from Raycast. The extension uses OpenClaw's native WebSocket protocol and works with local, LAN, Tailscale, and Cloudflare Access connections.

## What you can do

| Command | Purpose |
| --- | --- |
| OpenClaw Control Center | Monitor Gateway health, tasks, sessions, agents, nodes, channels, and usage |
| Ask OpenClaw | Ask a question in a new Gateway session |
| Chat with OpenClaw | Start or continue Gateway-backed conversations |
| Ask About Clipboard | Send clipboard text to OpenClaw with a question |
| Process Selected Text | Summarize, explain, translate, rewrite, or review selected text |
| Gateway Status | Check the authenticated connection, pairing, and protocol details |
| Open OpenClaw Control UI | Open the configured Control UI in your browser |

The Control Center is a fast operational view, not a replacement for OpenClaw's administrative UI. It requests only `operator.read` and `operator.write`. Approval management, configuration changes, and other administrative operations remain in OpenClaw.

## Requirements

- OpenClaw `2026.9.4` or a protocol-compatible Gateway
- A reachable local loopback `ws://` Gateway or remote `wss://` endpoint
- A Gateway token or password when bootstrap authentication is required
- `cloudflared` on the Raycast Mac for Cloudflare Access browser sign-in

The optional HTTP Chat Completions endpoint is not required.

## Connect

Raycast asks how it should reach OpenClaw on first launch.

| Connection | Gateway URL | Notes |
| --- | --- | --- |
| OpenClaw Configuration | Read from `~/.openclaw/openclaw.json` | Uses the local or remote mode in the file |
| Local Gateway | `ws://127.0.0.1:18789` | Gateway runs on the same Mac |
| Local Network | Private `wss://` URL | Use TLS even on a trusted LAN |
| Tailscale | OpenClaw-managed `wss://<machine>.<tailnet>.ts.net` URL | Requires Tailscale access on both machines |
| Cloudflare Tunnel and Access | Tunnel `wss://` hostname | Supports browser sign-in or a service token |

Remote modes validate the configured URL before connecting and require `wss://`. Plain `ws://` is accepted only for a loopback Gateway on the same Mac. If the URL field is empty, a matching `gateway.remote.url` from OpenClaw's configuration can be used.

## Pair the Raycast device

Run **Gateway Status**. If approval is required, the error shows the current request ID and approval command. On the Gateway host, review and approve that exact request:

```bash
openclaw devices list
openclaw devices approve <requestId>
```

Refresh **Gateway Status** after approval. Raycast requests only `operator.read` and `operator.write` and stores the durable device credential returned by OpenClaw. See OpenClaw's [pairing guide](https://docs.openclaw.ai/pairing).

## Remote connections

### Tailscale

Use OpenClaw-managed Tailscale Serve:

```bash
openclaw gateway --tailscale serve
```

Choose **Tailscale** in Raycast and enter the resulting secure endpoint. Keep the Gateway listener on loopback. See OpenClaw's [Connect and pair](https://docs.openclaw.ai/web/control-ui/connect-and-pair) and [Remote access](https://docs.openclaw.ai/gateway/remote) guides.

### Cloudflare Access

Choose **Cloudflare Tunnel and Access** and enter the tunnel's `wss://` hostname.

- **Browser sign-in** runs `cloudflared access login`. Cloudflare opens the identity provider allowed by the Access policy, such as GitHub or Google. A valid cached Access session is reused.
- **Service token** sends the configured client ID and secret as Cloudflare Access headers. Use this option for unattended connections.

Install the Cloudflare helper before using browser sign-in:

```bash
brew install cloudflared
```

Run **Gateway Status** to sign in. Raycast does not store the Access JWT or print `cloudflared` output. Cloudflare authenticates access to the tunnel; OpenClaw device pairing and Gateway authorization still apply. Follow OpenClaw's [Cloudflare Tunnel and Access guide](https://docs.openclaw.ai/gateway/cloudflare-access), and do not expose the Gateway port directly.

### SSH forwarding

Forward the remote loopback Gateway, then choose **Local Gateway on This Mac**:

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

## Credentials and local data

Raycast preferences take precedence over `~/.openclaw/openclaw.json`. Configuration discovery supports JSON5 comments and trailing commas.

- Local mode reads `gateway.auth.token` or `gateway.auth.password`.
- Remote mode reads `gateway.remote.url`, `gateway.remote.token`, or `gateway.remote.password`.
- File credentials are reused for an explicit remote connection only when its normalized URL matches `gateway.remote.url`.
- Secret references are not resolved. Enter the credential in Raycast or use an already paired device token.

Raycast's encrypted local extension storage holds the device identity, paired device tokens, local conversation history, and the cached Control Center snapshot. The snapshot contains operational metadata, not credentials. Clipboard or selected text is sent only when its command is used. The extension has no analytics service or intermediary server.

## Troubleshooting

### Pairing required

List pending devices, verify that the Raycast request asks for `operator.read` and `operator.write`, approve the current request ID, and refresh **Gateway Status**. A retry with a changed identity or scope can replace an older request.

### Gateway unavailable

- Local: run `openclaw gateway status` on the same Mac.
- Node-only Mac: use the main Gateway's secure remote URL or an SSH forward. Do not start a second Gateway.
- Remote: confirm that the route is reachable and accepts secure WebSocket traffic.
- Cloudflare browser sign-in: install `cloudflared`, then choose **Sign In to Cloudflare Access** in Gateway Status.
- Cloudflare service token: confirm that both fields are set and accepted by a Service Auth policy.

### Authentication rejected

Configure bootstrap authentication through OpenClaw, then let device pairing mint the durable client token. Do not hand-create per-client tokens in `openclaw.json`. See [Building a Gateway client](https://docs.openclaw.ai/gateway/clients).

## Development

```bash
npm install
npm run check
```

The OpenClaw Gateway packages are pinned so client and protocol changes are reviewed together. The bundle check loads every command from an isolated production bundle.

## Acknowledgments

Thanks to [@asaphko](https://github.com/asaphko) for the original icon and the first Gateway Status and web chat commands.
