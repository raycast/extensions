# Sidecar Display

[![CI](https://github.com/chiptoma/sidecar-display/actions/workflows/ci.yml/badge.svg)](https://github.com/chiptoma/sidecar-display/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
![Platform: macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)

A [Raycast](https://raycast.com) extension that connects your iPad over **Sidecar** and forces it to **extend** rather than mirror — reliably, from a hotkey or the menu bar, without ever moving or touching your main display.

![The Sidecar Display commands in Raycast](./media/commands.png)

It ships **two interchangeable engines** and picks the right one automatically:

- **BetterDisplay** — drives the `betterdisplaycli` binary. Proven and low-maintenance; needs the [BetterDisplay](https://github.com/waydabber/BetterDisplay) app.
- **Native** — a small Swift helper using the private `SidecarCore` framework plus public CoreGraphics. No external dependency at runtime.

No AppleScript, no System Settings window, no UI-tree scraping.

---

## Contents

- [Why this exists](#why-this-exists)
- [Install](#install)
- [Commands](#commands)
- [Preferences](#preferences)
- [How it works](#how-it-works)
- [Development](#development)
- [Publishing](#publishing)
- [Limitations](#limitations)
- [Documentation](#documentation)
- [License](#license)

---

## Why this exists

The usual way to attach an iPad is to click it under **Mirror or extend to** in System Settings → Displays. On a Mac that already uses a BetterDisplay **virtual screen as its main display** (a common multi-monitor setup), macOS often resolves that menu to _mirroring_ — so the iPad comes up showing a copy of your desktop, and you have to hand-run BetterDisplay's "Reconnect virtual displays" to get an extended desktop back.

This extension attaches Sidecar **programmatically**, which extends by default — and when macOS still comes up mirrored, it repairs it with one deliberate action, without ever writing or relocating your main display.

## Install

### From the Raycast Store

Not yet published to the Raycast Store. Install from source below.

### From source (local)

```sh
git clone https://github.com/chiptoma/sidecar-display.git
cd sidecar-display
npm install
npm run dev
```

`npm run dev` imports the extension into Raycast and hot-reloads it. Stopping it leaves the extension installed. `npm run build` type-checks and compiles without importing.

**Requirements**

- macOS with Sidecar support, and an iPad signed in to the same Apple ID.
- Raycast.
- For the **BetterDisplay** engine: [BetterDisplay](https://github.com/waydabber/BetterDisplay) running with CLI integration enabled (on by default) — `brew install --cask betterdisplay`. Tested against **BetterDisplay 4.3.5** with Pro; non-Pro is unverified.
- To **build from source** (either engine): a full **Xcode** install — the native engine's Swift is compiled at build time by Raycast's [`extensions-swift-tools`](https://github.com/raycast/extensions-swift-tools). (Store _users_ don't need Xcode; they install the already-compiled extension.)

## Commands

| Command                    | Behaviour                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Connect Sidecar**        | Attaches the iPad, waits for its display, applies the configured mode (extend by default). Idempotent.                                                                                                                                                                              |
| **Disconnect Sidecar**     | Detaches the iPad. Idempotent.                                                                                                                                                                                                                                                      |
| **Auto-Reconnect Sidecar** | Background command that restores a dropped link. Run it by hand to reconnect now. See [keep-alive](./docs/ARCHITECTURE.md#auto-reconnect-keep-alive).                                                                                                                               |
| **Fix Mirroring**          | Clears macOS Sidecar's own mirror mode when the iPad connects showing a copy of your main screen. Needs BetterDisplay.                                                                                                                                                              |
| **Sidecar Status**         | Menu-bar item: device name, connection **and presence** state (connected / nearby / away), connect / disconnect / extend / mirror actions, an Auto-Reconnect toggle, plus a device picker. Refreshes ~2×/min; disable Background Refresh on the command to update only when opened. |

Bind Connect and Disconnect to hotkeys in Raycast, or drive everything from the menu bar:

![The Sidecar Status menu-bar item](./media/menu-bar.png)

## Preferences

![Sidecar Display preferences](./media/preferences.png)

| Preference | Default | Purpose |
| --- | --- | --- |
| Engine | `auto` | Which tool talks to Sidecar. Automatic picks BetterDisplay when its CLI is installed, otherwise the built-in helper. |
| Show iPad Name | off | _Show the iPad's name beside the menu-bar icon._ Shown while connected or nearby, hidden while away. Off keeps a constant-width icon (friendlier to Bartender/Ice). |
| Auto-Fix Mirroring | **on** | _Fix mirroring automatically when the iPad connects._ Repairs an iPad that comes up mirroring your main screen. Runs on every fresh connect (the state is undetectable), so it briefly reshuffles the desktop. Requires BetterDisplay. |
| Display Mode | `extend` | What the iPad does once connected: extend your desktop, or mirror your main display. |
| iPad Name | _(empty)_ | Leave empty to auto-detect. Set it only to pin one iPad when you have several. |
| Auto-Reconnect | **on** | _Reconnect automatically after the link drops._ Only chases links that dropped by themselves. This is the default; the menu-bar toggle overrides it once used. Also needs Background Refresh on the Auto-Reconnect Sidecar command. |
| Give Up After (hours) | `24` | How long to keep trying an iPad that looks present but won't connect, before stopping so macOS stops showing connection-failed notifications. The clock only runs while the iPad is detected nearby, so time genuinely away never counts. `0` tries forever. |
| BetterDisplay CLI Path | `/opt/homebrew/bin/betterdisplaycli` | Path to the binary (Intel Homebrew: `/usr/local/bin/...`). |
| Give Display Changes (seconds) | `6` | How long to wait for a display change to take effect before reporting. Clamped to 2–60. |

Every auto-reconnect timing knob is configurable. Note that Raycast runs background commands only about **once a minute**, so backoff values under ~60 s effectively mean "every tick" — the sub-minute knobs mostly shape the tail of the fast phase.

## How it works

macOS Sidecar has its own "Mirror / Use as Separate Display" mode that is **invisible to every display API** — CoreGraphics, `NSScreen`, and BetterDisplay all report the iPad as extended even while it is showing a copy of your screen. So the extension **cannot detect** the mirrored state. Instead it **extends by default** by attaching Sidecar programmatically, and when macOS still comes up mirrored it repairs it with one deliberate action ([Fix Mirroring](#commands)).

Every window-affecting change is **converge-and-hold**: the mode is re-asserted until it reads correct several times running, because macOS spends about a second rearranging a fresh Sidecar display — often mirrored first, then extended.

**Safety — the main display is sacred.** The extension never writes or relocates your main display, and the connect/mode path never disconnects or power-cycles any display. Mirroring always keeps your current main as master (never the iPad), and both mode writes are refused when the iPad is itself main. The one place a display is ever cycled is the explicit, opt-in Fix Mirroring — virtual screens only, never physical, always reconnected. This isn't theoretical: an earlier "mitigation" once scrambled every window and caused a logout, and was removed entirely.

**→ Full architecture, safety invariants, design decisions, and project layout: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).**

## Development

```sh
npm install
npm run dev          # import into Raycast + hot-reload
npm run lint         # ESLint + Prettier
npm run build        # compile + generate types + typecheck (no import)
npm run test:unit    # hardware-free tests — run before every commit
```

Building needs a full **Xcode** install: the native engine's Swift is a standard SPM package in `swift/` that `ray build`/`ray develop` compile for you (generating the `swift:../../swift` bridge). You never run `swiftc`, and no binary is committed. The pure decision logic — the keep-alive state machine and the connect orchestration — is unit-tested headlessly against mocks, so the safety invariants are proven without any hardware.

**→ Full runbook (setup, testing matrix, CI, releasing, publishing, troubleshooting): [docs/WORKFLOWS.md](./docs/WORKFLOWS.md).** Conventions (banners, naming, TypeScript/Swift rules, commits) live in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Publishing

Public Raycast Store extensions are submitted as a **pull request to [`raycast/extensions`](https://github.com/raycast/extensions)** and reviewed by a human — there is no headless/CI publish, and all Store extensions are free and open-source (MIT).

```sh
npm run publish      # build + typecheck + tests, then opens the store PR
```

Pushing a `v*` git tag cuts a GitHub Release automatically. Full checklist: [docs/WORKFLOWS.md](./docs/WORKFLOWS.md#6-publishing-to-the-raycast-store).

## Limitations

- Auto-reconnect and the menu-bar status are interval-polled, not event-driven. macOS does publish display and wake events, but receiving one needs a process that stays alive, and Raycast commands are spawned per run and exit — a scheduled interval is the only background trigger available. Reconnection lands within about one interval of a drop, and the menu-bar icon within about 30 seconds of a change made outside the extension (changes made through it refresh immediately).
- Connecting the iPad from Control Center or the AirPlay menu (rather than through this extension) will not run the extend/mirror logic, and auto-reconnect will not treat that as an intent to keep alive.
- macOS itself decides which display is main when Sidecar attaches, and can put main on the iPad. The extension reports that and leaves the arrangement to you — it never writes the main display.
- If the display mode won't settle, the extension reports it rather than forcing it. Fix a stuck arrangement by hand in BetterDisplay or Displays settings.
- The menu bar and background commands are macOS-only.
- Sidecar's own mirror mode is invisible to every display API, so the mirror fix is a manual/opt-in action, not an automatic "detect and repair."
- Presence detection reads an **undocumented** macOS field, so it may change with a future release. It is treated as fallible: a real connection is still attempted periodically even while the iPad reads as away, so a wrong reading cannot silently stop reconnects.

## Documentation

| Resource                                                      | What's inside                                                               |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)                | How it works, safety invariants, design decisions, project structure        |
| [docs/WORKFLOWS.md](./docs/WORKFLOWS.md)                      | Setup, dev loop, testing matrix, CI, releasing, publishing, troubleshooting |
| [CONTRIBUTING.md](./CONTRIBUTING.md)                          | Conventions: banners, naming, TypeScript/Swift rules, commits               |
| [CHANGELOG.md](./CHANGELOG.md) · [SECURITY.md](./SECURITY.md) | Release notes · security policy                                             |

## License

[MIT](./LICENSE)
