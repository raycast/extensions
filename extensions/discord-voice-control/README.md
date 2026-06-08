# Discord Voice Control (Raycast)

Toggle Discord **mute** and **deafen** from Raycast without leaving your current app. Local-only,
macOS-only, zero backend.

This extension is **best-effort**: it sends the toggle keybind to Discord and reports that the
toggle was **sent** — it does **not** confirm the resulting voice state. See
[Known limitations](#known-limitations).

## Commands

| Command | Mode | What it does |
| --- | --- | --- |
| **Toggle Mute** | no-view | Sends the configured Discord mute keybind (default `Cmd+Shift+M`). |
| **Toggle Deafen** | no-view | Sends the configured Discord deafen keybind (default `Cmd+Shift+D`). |
| **Check Voice Control Status** | view | Shows whether the extension is ready to attempt a toggle. |

## How it works

1. Activates Discord (Stable, bundle id `com.hnc.Discord`).
2. Sends the in-app keybind via macOS Accessibility (`osascript` → System Events keystroke).
3. Restores your previously focused app. A brief Discord flash during dispatch is the accepted cost.

There is **one** control path (shortcut dispatch) and **no fallback**. State confirmation
(via Discord RPC) was proven feasible in Phase 1 but intentionally dropped to keep the product
zero-setup — see `vibe/phases/phase-01-results/decision-record.md`.

## Setup

### Requirements
- macOS
- Raycast 1.26.0+
- Node.js 22.14+ and npm 7+ (for development only)
- Discord **Stable** desktop app, installed and running, with you logged in

### macOS permission
The extension needs **Accessibility** permission to send keystrokes and activate Discord:

1. System Settings → Privacy & Security → **Accessibility**
2. Enable **Raycast** (the status command has a button that opens this pane).

### Shortcut configuration
The extension's mute/deafen shortcuts **must match your Discord in-app keybinds**. Defaults are
`cmd+shift+m` (mute) and `cmd+shift+d` (deafen) — Discord's defaults.

- Check Discord → User Settings → **Keybinds**.
- If yours differ, open the extension preferences and set the combo strings
  (format: `cmd+shift+m`; aliases `command`/`opt`/`alt`/`ctrl`/`control` are accepted).

### Development
```bash
npm install
npm run dev          # launch in Raycast dev mode (run this yourself)
npm run quality      # typecheck + lint + format check + tests
```

## Known limitations

- **No state confirmation.** The extension reports the toggle was *sent*, never that you are *muted*
  or *deafened*. If Discord didn't have focus-independent in-app keybinds applied, or you weren't in
  a voice channel, the result may differ from what you expect and the extension cannot detect it.
- **No fallback.** If your Discord keybinds change and you don't update the extension preferences to
  match, toggles will silently no-op in Discord while still reporting "sent". Use **Check Voice
  Control Status** to diagnose.
- **Discord Stable only.** PTB/Canary are out of scope.
- **Brief focus flash.** Discord is briefly activated during dispatch, then your previous app is
  restored.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Discord is not running" | Discord closed | Open Discord. |
| "Accessibility permission is required" | Permission not granted | Grant Raycast in System Settings → Privacy & Security → Accessibility. |
| "No valid shortcut is configured" | Bad combo string in preferences | Set a valid combo, e.g. `cmd+shift+m`. |
| Toggle says "sent" but nothing changes in Discord | Extension keybind ≠ Discord keybind, or you're not in voice | Match the keybinds in preferences; ensure you're in a voice channel. |
| "result is unclear" | Ambiguous dispatch | Check Discord directly. |

## Privacy

- 100% local. No backend, no telemetry, no remote storage.
- Reads only process/installation facts about Discord — never account, server, channel, or message
  content.
- Optional diagnostic logging (off by default) writes sanitized JSON lines to the extension's local
  support folder only. It records action/mechanism/outcome/reason code/sanitized detail — never
  message content, server/channel names, or tokens.

### Dependency audit notes

`npm audit` reports findings in transitive **devDependencies** only (the Vitest/Vite/esbuild test
toolchain and the `@typescript-eslint` chain pulled in by `@raycast/eslint-config`). These are
**not** shipped: the only runtime dependencies are `@raycast/api` and `@raycast/utils`, so no audit
finding reaches the published extension or a user's machine.

The remaining findings are **intentionally not force-fixed**:

- The esbuild/Vite advisory only affects a running Vite dev server, which this project never starts
  (Vitest uses Vite's bundler internally but exposes no dev server).
- `npm audit fix --force` would pull a major Vitest bump (v2 → v4), risking test-config breakage for
  no benefit to shipped code.
- The `@typescript-eslint` versions are pinned by `@raycast/eslint-config`; they clear when Raycast
  bumps that config, not by an independent upgrade.

Run `npm audit fix` (without `--force`) to pick up safe, non-breaking patches only.
