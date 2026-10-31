# Proxy Manager for Raycast

Drive [ProxyManager](https://github.com/chaim-chv/proxy-manager) — the macOS menu-bar app that routes chosen hosts through a SOCKS5 tunnel — from Raycast: flip routing, add and remove targets, and see why a host is going through the tunnel or around it, without switching to the app.

The extension talks to ProxyManager's local control socket. It does not read config files, does not scrape the UI, and does not keep its own state.

```
⌃⌥P            toggle routing, one HUD
"proxy"        hub: state, the site you're on, the app you came from, targets
"add target"   form, with an optional host argument
"explain"      why this host is direct (and the one-key fix)
"app routing"  per-app rules
```

## Requirements

- macOS and Raycast **1.104 or newer** (Raycast 2 works too; one build covers both).
- ProxyManager installed and running, with **Settings → Integration → Allow external control** and **Apps and CLI** turned on.
- The free [Raycast browser extension](https://raycast.com/browser-extension) if you want the "site you're on" row. Without it the extension silently falls back to a link on the clipboard.

## Setup

1. Install and open [ProxyManager](https://github.com/chaim-chv/proxy-manager), then finish its first-run setup so it has a tunnel and targets.
2. In ProxyManager: **Settings → Integration** → enable **Allow external control** and **Apps and CLI**.
3. Run any command. ProxyManager shows a consent sheet — **Allow Control**, or **Read Only** if you only want to look. The decision is remembered per code identity and can be revoked in the same pane.

Reads keep working with **Read Only**; only changes fail, with a toast that says to approve again.

Every command renders one actionable empty state when the app is closed or external control is off, so a misconfigured setup is never a dead end.

## Commands

| Command | Default | What it is for |
|---|---|---|
| **Proxy Manager** | Enter on a row | The hub. The routing state with the action that state needs (Turn On / Turn Off / Retry), then **Right Now**: the site in your browser tab and the app you came from, each with the one action that matters. Then the target list with edit/remove/reveal. |
| **Toggle Routing** | `⌃⌥P` (suggested) | One round trip, no view, a HUD that reads `Routing ON · 8/12 targets`. |
| **Add Target** | `host` argument | Normalises a URL or host into a target; prefills the tab you're on. `⌘⇧↵` adds another without leaving the form. |
| **Explain Host Routing** | `host` argument | Takes the host from the argument, else the active tab, else the clipboard, else a form — then shows the decision and the matching rule, with the fix as the primary action. |
| **App Routing** | — | Starts with the app you're in: its effective mode and one-key Tunnel / Targets / Direct. Then per-app routing on/off, the default mode, and the rule list. Adding a rule picks from installed apps instead of typing a bundle ID. |

The "site you're on" row reports what actually happens to that host: it only says **Tunneled** when an enabled rule matches, no app rule bypasses it, and routing is on.

### Piping things in

Both `add-target` and `explain-host` take an optional `host` argument, so they work from a hotkey, a Quicklink or a deeplink:

```bash
# arguments are URL-encoded JSON, keyed by the manifest argument name
open "raycast://extensions/chaim-chv/proxy-manager/explain-host?arguments=%7B%22host%22%3A%22api.example.com%22%7D"
```

The argument accepts a full URL; the extension extracts and normalises the host.

## How it works

```
Raycast command → src/lib/api.ts → src/lib/control.ts
   → ~/Library/Application Support/ProxyManager/control.sock
   → ProxyManager → IntegrationRouter → AppModel
```

- One batched read on open (`status` first, then the reads and local context in parallel), one call per mutation, then a re-read. Nothing polls.
- The socket requires the per-launch token from `control.token`; the extension reads it on every call, so a ProxyManager restart never leaves a stale secret.
- Context comes from `getFrontmostApplication()` (no Automation prompt) and the active browser tab via Raycast's browser extension — read once per open, only when that extension is already installed. Precedence: **argument → active tab → clipboard**.
- No network access, no telemetry, no analytics. The active tab's favicon is deliberately not fetched: that would mean contacting every site you visit.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "External control is off" | The master switch or "Apps and CLI" is off | ProxyManager → Settings → Integration → turn both on |
| "Proxy Manager isn't running" | App quit; the socket and token disappear with it | Open the app, then press `⌘R` |
| First call hangs for a few seconds | The consent sheet is waiting for you in ProxyManager | Approve it; the decision is remembered |
| Changes fail but reads work | You approved **Read Only** | Revoke the identity in Settings → Integration, then approve again with **Allow Control** |
| The host is rejected | The app validates target patterns | The form mirrors those rules; the message appears under the field |
| No "Right Now" site row | Raycast's browser extension is not installed, or no http(s) tab is active | Install it; the extension never prompts for it |
| No "Right Now" app row | Per-app routing is off in ProxyManager | Turn it on in App Routing (or ProxyManager → Settings → Apps) |

Logs:

```bash
log stream --predicate 'subsystem == "com.proxymanager.app" AND category == "integration"'
tail -f ~/Library/Application\ Support/ProxyManager/integration-audit.jsonl
```

## Security

- The socket is `0600` and only accepts connections from the same UID; the token is a second, accidental-access guard. This protects against unapproved apps, not against malware running as you.
- The extension sends a fixed identity (`Raycast`) for the consent sheet. It never asks for, stores or transmits credentials.

## Development

This folder is the extension as the Store receives it. The [source repository](https://github.com/chaim-chv/proxy-manager-raycast) also holds the tests, the design notes, the agent skills and the icon/screenshot scripts; its [AGENTS.md](https://github.com/chaim-chv/proxy-manager-raycast/blob/main/AGENTS.md) is the working guide, and the protocol reference lives in [docs/control-protocol.md](https://github.com/chaim-chv/proxy-manager-raycast/blob/main/docs/control-protocol.md).

```bash
bun install
bun run dev        # watcher + import into Raycast
bun run build      # distribution build + type check
bun run lint       # manifest, icon, ESLint, Prettier
bun test           # unit tests, when the tests folder is present
```

`package-lock.json` is committed because the Store's CI installs with npm; development uses bun.

## License

MIT. The extension icon is ProxyManager's own mark; the agent skill bundled in the source repository is adapted from Apache-2.0 material, credited in [THIRD-PARTY-NOTICES.md](https://github.com/chaim-chv/proxy-manager-raycast/blob/main/THIRD-PARTY-NOTICES.md).
