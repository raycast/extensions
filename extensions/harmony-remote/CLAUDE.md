# Harmony Remote — Raycast Extension

A Raycast extension for controlling a Logitech Harmony Hub via configurable shortcuts.
Users discover their hub, pick up to 10 shortcuts (activities, device commands, All Off), then fire them from a searchable list.

## Architecture

```
src/
  lib/harmony.ts      — Client, storage, types. The entire backend.
  harmony-remote.tsx   — Main command. Shows shortcut list, executes on Enter.
  setup-hub.tsx        — Setup command. Hub discovery + shortcut configuration UI.
```

Two commands registered in `package.json`:
- **Harmony Remote** (`harmony-remote`) — List view of configured shortcuts. Execute with Enter.
- **Setup Harmony Hub** (`setup-hub`) — SSDP discovery, then shortcut picker (activities, device commands, All Off).

## Key Patterns

### `withHub(async (hub) => { ... })`
Connect to hub, run action, disconnect. Used by the main remote command to execute shortcuts.
Reads hub IP from LocalStorage. Uses cached config (24h TTL) or fetches fresh.

### `executeShortcut(shortcut)`
Dispatches by `shortcut.type`:
- `"activity"` — `client.startActivity(id)`
- `"off"` — `client.turnOff()`
- `"device-command"` — `holdAction` + sleep + `releaseAction` loop with configurable repeats

### Shortcut Storage
- Shortcuts saved as JSON array in Raycast `LocalStorage` under `"harmony-shortcuts"`
- Hub IP stored under `"harmony-hub-ip"`
- Hub config (devices + activities) cached under `"harmony-hub-config"` with 24h TTL
- Max 10 shortcuts enforced in UI

### Setup Flow State Machine
1. Check for saved hub IP
2. No IP → SSDP discovery (10s scan on port 61991)
3. Hub selected → connect, fetch config, show shortcut picker
4. Hub already saved → skip discovery, go straight to shortcut picker

## Harmony Hub Protocol

- npm: `@harmonyhub/client-ws` (WebSocket) and `@harmonyhub/discover` (SSDP)
- `@harmonyhub/discover` exports `{ Explorer }` (named export, NOT default)
- Hub must be on same LAN. Port 8088 (WebSocket) and 5222 (XMPP).
- Protocol is frozen — Logitech discontinued Harmony. Packages won't update but won't break.

## Raycast Extension Conventions

- `package.json` `$schema` must point to `https://www.raycast.com/schemas/extension.json`
- View commands export React components as default
- Icons in `assets/` — 512x512 PNG, dark background preferred
- `@types/react` must be `19.0.10` to match what `@raycast/api` bundles internally
- Store submission: copy into forked `raycast/extensions` monorepo, submit PR

## Extension Preferences

| Preference | Default | Description |
|-----------|---------|-------------|
| `commandHoldTime` | 100ms | Duration to hold each button press |
| `commandDelay` | 50ms | Delay between repeated commands |

## Development

```bash
npm install
npm run dev    # loads into Raycast
npm run lint
npm run build
```
