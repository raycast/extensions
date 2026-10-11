# Am I Online

Checks whether you are actually online, and when you are not, shows which part of the connection is failing.

Most connectivity checks hit one URL and trust a `200` response. That gets fooled by captive portals (café and hotel login pages) and cached responses. Am I Online uses a stricter rule: you are online when a fresh, certificate-verified HTTPS request reaches a real public server. A captive portal or proxy cannot present a valid certificate for `cloudflare.com`, `gstatic.com`, or `apple.com`, so a successful handshake with the expected response is hard to fake. It tries a few well-known endpoints, and a single verified one is enough.

## What it checks

The layers are tested top to bottom, so the first failure from the top is usually the cause:

1. **Interface**: is there an active network connection? (shows the Wi-Fi name when available)
2. **Gateway**: is your router reachable? (ping, with a TCP fallback for routers that block ping)
3. **DNS**: each configured resolver is asked to actually resolve a name, not just answer on port 53
4. **Internet**: a set of independent, certificate-verified endpoints:
   - `https://1.1.1.1/cdn-cgi/trace` (works even when DNS is down, and reports your public IP)
   - `https://www.gstatic.com/generate_204`
   - `https://captive.apple.com/hotspot-detect.html`
5. **My services**: your own optional targets (`host:port` or full URLs)

It also flags an active **VPN** or a configured system **proxy** when present, since either changes how your traffic reaches the internet.

To avoid false positives, requests carry a random cache-buster and `no-store`, redirects are not followed so login pages stay visible, and a plain HTTP probe separates a captive portal from a real outage.

## Verdicts

| Verdict | Meaning |
| --- | --- |
| 🟢 Online | A verified HTTPS check succeeded |
| 🟠 Online, DNS not resolving | You can reach the internet by IP, but names are not resolving |
| 🟡 Sign-in required (captive portal) | The network is holding you behind a login page |
| 🔴 No internet | The router is reachable, but the internet is not |
| 🔴 Router unreachable | There is a default route, but the gateway does not answer |
| ⚫ Not connected | No active network interface |

## Command

**Check Connection**: a detailed view of every layer with response times, the verdict, a re-check action, and copy-diagnostics.

## Preferences

- **Custom targets**: extra hosts to check, comma or newline separated (`192.168.1.222:8081`, `https://example.com`)
- **Show your public IP**: off by default
- **Identify upstream resolver**: for a local resolver, shows the upstream resolver behind it (its public IP, plus a reverse-DNS name when available). One extra DNS lookup, off by default.

## Privacy

Everything runs on your machine. The only outbound requests go to the connectivity endpoints listed above and any custom targets you add. Your public IP is read from the Cloudflare endpoint and shown only if you turn it on. It is never stored or sent anywhere else.

## Development

```bash
npm install
npm run dev      # imports into Raycast as a development extension
npm run build    # verify it compiles
npm run lint
```

Requires macOS (uses `route`, `netstat`, `scutil`, and `ping` for local checks).
