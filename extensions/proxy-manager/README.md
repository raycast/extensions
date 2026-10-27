# Proxy Manager for Raycast

Drive [ProxyManager](https://github.com/chaim-chv/proxy-manager) — the macOS
menu-bar app that routes chosen hosts through a SOCKS5 tunnel — from Raycast: flip
routing, add and remove targets, and see why a host is going through the tunnel or
around it, without switching to the app.

The extension talks to ProxyManager's local control socket. It does not read
config files, does not scrape the UI, and does not keep its own state.

```
⌃⌥P            toggle routing, one HUD
"proxy"        hub: state, clipboard suggestion, targets
"add target"   form, with an optional host argument
"explain"      why this host is direct (and the one-key fix)
"app routing"  per-app rules
```

## Requirements

- macOS and Raycast **1.104 or newer** (Raycast 2 works too — see
  [docs/raycast-versions.md](docs/raycast-versions.md)).
- ProxyManager running, with **Settings → Integration → Allow external control**
  and **Apps and CLI** turned on.
- Node 22.22.2+ and [bun](https://bun.sh) for development.

## Install (development build)

```bash
git clone https://github.com/chaim-chv/proxy-manager-raycast.git
cd proxy-manager-raycast
bun install
bun run dev
```

`bun run dev` builds the extension and imports it into the running Raycast. The
commands stay installed after you stop the watcher.

The first request shows a consent sheet inside ProxyManager —
**Allow Control** (or **Read Only** if you only want to look). The decision is
remembered per code identity; revoke it in ProxyManager → Settings → Integration.

## Commands

| Command | Default | What it is for |
|---|---|---|
| **Proxy Manager** | Enter on a row | The hub. The routing state with the action that state needs (Turn On / Turn Off / Retry), then **Right Now**: the site in your browser tab and the app you came from, each with the one action that matters. Then the target list with edit/remove/reveal. |
| **Toggle Routing** | `⌃⌥P` (suggested) | One round trip, no view, a HUD that reads `Routing ON · 8/12 targets`. |
| **Add Target** | `host` argument | Normalises a URL or host into a target; prefills the tab you're on. `⌘⇧↵` adds another without leaving the form. |
| **Explain Host Routing** | `host` argument | Takes the host from the argument, else the active tab, else the clipboard, else a form — then shows the decision and the matching rule, with the fix as the primary action. |
| **App Routing** | — | Starts with the app you're in: its effective mode and one-key Tunnel / Targets / Direct. Then per-app routing on/off, the default mode, and the rule list. Adding a rule picks from installed apps instead of typing a bundle ID. |

Full rationale, including what is deliberately *not* a command and why, is in
[docs/ux.md](docs/ux.md).

### Piping things in

Both `add-target` and `explain-host` take an optional `host` argument, so they
work from a hotkey, a Quicklink or a deeplink:

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

- One batched read on open (`status` first, then the reads and local context in
  parallel), one call per mutation, then a re-read. Nothing polls.
- The socket requires the per-launch token from `control.token`; the extension
  reads it on every call, so a ProxyManager restart never leaves a stale secret.
- Context comes from `getFrontmostApplication()` (no Automation prompt) and the
  active browser tab via Raycast's browser extension — read once per open, only
  when that extension is already installed. Precedence: **argument → active tab →
  clipboard**.
- When the app is closed, the hub shows a single empty state with "Open Proxy
  Manager" or "Open Settings" depending on whether the app is running.
- A cached `Dashboard` paints the second open instantly; it is always replaced by
  a live read. Context rows are never cached.

Protocol details, payloads and error codes: [docs/control-protocol.md](docs/control-protocol.md).
What a Store submission needs (and what still blocks one):
[docs/store-submission.md](docs/store-submission.md).

## Development

```bash
bun run dev         # watcher + import into Raycast
bun run build       # compile and type check (writes dist/)
bun run typecheck   # tsc --noEmit
bun test            # host normalisation tests (no Raycast runtime needed)
bun run lint        # ray lint: manifest, icon, ESLint, Prettier
bun run lint:code   # ESLint + Prettier only (what CI runs)
bun run fix-lint    # ray lint --fix
```

`ray lint` also checks the `author` field against the Raycast Store and fails
while the handle is not registered there. CI therefore runs `lint:code`,
`typecheck`, `test` and `build`; the manifest and icon are validated by
`ray lint` locally and by `ray build`.

Two lockfiles live here on purpose: `bun.lock` drives development, and
`package-lock.json` exists because a Store submission is reviewed and built with
npm by Raycast's CI. After changing dependencies, regenerate both
(`bun install` and `npm install --package-lock-only`).

The icon **is** ProxyManager's app icon: the transparent margin macOS adds around
its squircle is trimmed and the artwork is scaled to 512×512, so Raycast's own
corner mask lines up with it. Regenerate it after an icon change:

```bash
# 1. render ProxyManager's 1024×1024 source icon (in the ProxyManager repo)
xcrun swiftc -O Tools/AppIcon/main.swift -o /tmp/appicon-gen
/tmp/appicon-gen /tmp/appicon.png

# 2. trim the transparent margin and write the Raycast icon
swift scripts/make-icon.swift /tmp/appicon.png assets/extension-icon.png
```

Layout:

```
src/
  index.tsx              hub: state, Right Now (site + app), targets
  toggle-routing.ts      no-view hotkey path
  add-target.tsx         form command, prefilled from the active tab
  explain-host.tsx       explanation view
  app-routing.tsx        per-app rules, frontmost app first
  components/            TargetForm, ConnectionError, AppPicker, AppMode actions
  lib/                   control (socket), api, host, context, dashboard, app-mode,
                         presentation, navigation, toast
tests/                   bun tests for the pure modules
docs/                    protocol, UX contract, architecture, Raycast versions,
                         Store submission
.agents/skills/          skills for agents working on this repo
CHANGELOG.md             version history shown in the Raycast Store
scripts/make-icon.swift  derives the extension icon from the app icon
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "External control is off" | The master switch or "Apps and CLI" is off | ProxyManager → Settings → Integration → turn both on |
| "Proxy Manager isn't running" | App quit; the socket and token disappear with it | Open the app, then press `⌘R` |
| First call hangs for a few seconds | The consent sheet is waiting for you in ProxyManager | Approve it; the decision is remembered |
| Mutations fail but reads work | You approved **Read Only** | Revoke the identity in Settings → Integration, then approve again with **Allow Control** |
| `security: …` / `invalid_argument` | The app rejected the host | The form mirrors the app's rules; look at the message under the field |
| Commands missing from root search | Dev import folder moved or deleted (red triangle) | Re-run `bun run dev` from this folder |
| `ray lint` fails with `Invalid author` | The manifest handle is not a registered Raycast Store user | Use `bun run lint:code` locally; publishing needs a Store account with that handle |
| No "Right Now" site row | Raycast's browser extension is not installed, or no http(s) tab is active | Install the Raycast browser extension; the command never prompts for it |
| No "Right Now" app row | Per-app routing is off in Proxy Manager | Turn it on in App Routing (or Proxy Manager → Settings → Apps) |
| `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` from bun | A TLS-inspecting proxy in front of npm | `NODE_TLS_REJECT_UNAUTHORIZED=0 bun install`, or set `cafile` in `~/.bunfig.toml` |

Logs:

```bash
log stream --predicate 'subsystem == "com.proxymanager.app" AND category == "integration"'
tail -f ~/Library/Application\ Support/ProxyManager/integration-audit.jsonl
```

## Security

- The socket is `0600` and only accepts connections from the same UID; the token
  is a second, accidental-access guard. This protects against unapproved apps,
  not against malware running as you.
- The extension sends a fixed identity (`Raycast`) for the consent sheet. It
  never asks for, stores or transmits credentials.
- **No network access.** The active tab's URL and title are read locally through
  Raycast's browser extension (only when you already have it installed), and the
  tab's favicon is not fetched — showing it would mean contacting every site you
  visit. No telemetry, no analytics.

## License

MIT for this extension. The agent skill under
`.agents/skills/raycast-extension/` is adapted from Apache-2.0 material; see
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
