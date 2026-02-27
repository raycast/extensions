# Raycast Bridge

Companion Raycast extension that exposes a local HTTP API for external control of Raycast.

Runs an HTTP server on `127.0.0.1:17638` inside Raycast's process, providing programmatic access to extensions, applications, clipboard, and system state.

## Setup

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Start development mode:

```bash
npm run dev
```

3. Open Raycast and run **"Start Bridge Server"**.

## Commands

| Command | Mode | Description |
|---|---|---|
| Start Bridge Server | no-view | Starts the HTTP server on port 17638 |
| Stop Bridge Server | no-view | Stops the running server |
| Bridge Status | menu-bar | Shows server status in the menu bar (auto-refreshes every 30s) |

## API

All responses use a standardized envelope:

```json
// Success
{ "ok": true, "data": { ... } }

// Error
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "...", "hint": "..." } }
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server status, protocol version, uptime |
| `POST` | `/run` | Run an extension command (fire-and-forget) |
| `GET` | `/extensions` | List installed extensions with commands |
| `GET` | `/extensions/:author/:name` | Get a specific extension |
| `GET` | `/apps` | List installed macOS applications |
| `GET` | `/frontmost` | Get the frontmost application |
| `GET` | `/clipboard` | Read clipboard contents |
| `GET` | `/selected-text` | Get currently selected text |
| `DELETE` | `/shutdown` | Stop the server |

### POST /run

```json
{
  "owner": "fedevitaledev",
  "extension": "music",
  "command": "play"
}
```

### GET /extensions?name=music

Returns extensions filtered by name (optional query parameter).

### GET /clipboard?offset=0

Returns clipboard contents. `offset` (optional) selects from clipboard history.

## Architecture

```
src/
├── start-server.ts              # Entry point — starts HTTP server
├── stop-server.ts               # Sends DELETE /shutdown
├── status.tsx                   # Menu bar status display
├── utils/
│   └── response.ts              # ok() / fail() response helpers
└── server/
    ├── router.ts                # HTTP routing + CORS
    └── handlers/
        ├── health.ts            # GET /health
        ├── run.ts               # POST /run
        ├── extensions.ts        # GET /extensions
        ├── apps.ts              # GET /apps
        ├── system.ts            # GET /frontmost, /clipboard, /selected-text
        └── shutdown.ts          # DELETE /shutdown
```

## Build

```bash
npm run build        # ray build --skip-types
npm run lint         # ray lint
npm run fix-lint     # ray lint --fix
npm test             # Integration tests (requires running server)
```

## Notes

- Port `17638` is fixed — no discovery file needed.
- CORS is set to `*` so any local tool can connect.
- Request body size is limited to 1 MB.
- `launchCommand` is fire-and-forget: the bridge cannot return data from launched commands.
- First-time `launchCommand` calls require user confirmation in Raycast.
- Extension listing reads from `~/.config/raycast/extensions/*/package.json` (override with `RAYCAST_EXTENSIONS_DIR` env var).

## License

MIT
