# 06 — Hermes Desktop ↔ Raycast integration: how Desktop talks to the backend, and what "syncing correctly" requires

**Research date:** 2026-08-19
**Method:** static read of the local source tree at `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent` + live read-only probes of the running processes/ports on this machine.
**Rule applied:** every non-obvious claim carries a `file:line` citation or is labelled from a live observation. Anything I could not verify is marked **UNVERIFIED**.
**Adversarial fact-check pass (2026-08-19):** ~45 cited claims were re-read against the source at the exact line numbers, and the server-B live probes were re-run. Corrections applied in §2.3, §3.1, §4.3, §5.1, §6.2, §8.2, §10.4, §10.8, §10.9, §10.10, §12.6 and the §0 summary; the remaining citations resolved as written.

> **Secrets policy note.** This document names *paths* and *config-key names* only. No token, key, or nonce value appears anywhere below.
>
> **Paths anonymized.** Before this repository was made public, the Windows account name in home
> paths was replaced by `<usuario>` — so `C:\Users\<usuario>\AppData\Local\hermes`. That is the
> only edit applied to the literal transcripts below; everything else is verbatim.

---

## 0. Executive summary — read this first

There are **two different HTTP servers** in a running Hermes install, and they are easy to confuse because *both* serve a path called `/api/sessions`:

| | **A. Desktop backend** (`hermes serve`) | **B. Gateway platform API server** (`api_server`) |
|---|---|---|
| Implementation | `hermes_cli/web_server.py` (FastAPI + uvicorn) | `gateway/platforms/api_server.py` (aiohttp) |
| Spawned by | Electron main, per Desktop launch | the long-lived `hermes gateway run` process |
| Bind | `127.0.0.1` + **ephemeral port (`--port 0`)** | `127.0.0.1:8642` (config-driven), webhook on `8644` |
| Auth | `X-Hermes-Session-Token: <ephemeral token>` (or `Authorization: Bearer <same token>`) | `Authorization: Bearer <API_SERVER_KEY>` |
| Token lifetime | in-memory only, dies with the process, **never written to disk** | durable secret in `HERMES_HOME/.env` (key name `API_SERVER_KEY`) |
| Reachable by Raycast? | **No** (port undiscoverable + token unobtainable) | **Yes** |
| Writes sessions to | `HERMES_HOME/state.db` | `HERMES_HOME/state.db` — **the same file** |

**Therefore: the Raycast extension must integrate through server B (`http://127.0.0.1:8642`, `Authorization: Bearer <API_SERVER_KEY>`), and the two-way sync works because both servers read and write the same SQLite `state.db`.** The Desktop then picks the change up automatically — its backend runs a 0.5 s mtime watcher on `state.db`/`state.db-wal` and pushes a `sessions.changed` event to the UI over its WebSocket (`tui_gateway/server.py:3840`, `3856-3884`, `3890-3909`).

The five hard rules that decide whether the data actually shows up are in **§8**. The single most surprising one:

> `POST /api/sessions` with the default `source` (`"api_server"`) creates a row that **does not appear in the Desktop "Recents" sidebar** — `api_server` is classified as a *messaging platform* source (`apps/desktop/src/lib/session-source.ts:52-73`) and the recents slice explicitly excludes it (`apps/desktop/src/app/session/hooks/use-session-list-actions.ts:49`). Send `"source": "desktop"`. And a session with **zero messages never appears at all**, because the sidebar queries `min_messages=1` — applied server-side by the batched sidebar route (`hermes_cli/web_routers/profiles.py:398-400`) and by the client-side legacy fallback (`apps/desktop/src/hermes.ts:651`).

---

## 1. Live topology observed on this machine (2026-08-19)

Process tree (from `Get-CimInstance Win32_Process`):

```
explorer.exe (9492)
└── Hermes.exe (9880)
    └── Hermes.exe (32196)                     <- Electron main
        ├── Hermes.exe --type=renderer (7140)
        └── python.exe (29256)                 <- venv\Scripts\python.exe -m hermes_cli.main serve --host 127.0.0.1 --port 0
            └── python.exe (28636)             <- re-exec into .hermes-runtime\python\...\python.exe, SAME argv
                                                  *** this child owns the listening socket ***

(detached, no live parent)
python.exe (25880)                             <- venv\Scripts\python.exe -m hermes_cli.main gateway run
└── python.exe (25936)                         <- re-exec into .hermes-runtime python, same argv
                                                  *** owns 127.0.0.1:8642 and 0.0.0.0:8644 ***
```

Listening sockets (from `Get-NetTCPConnection`):

```
127.0.0.1:50596   PID 28636   <- Desktop backend (ephemeral, changes every launch)
127.0.0.1:8642    PID 25936   <- gateway api_server platform
0.0.0.0:8644 / [::]:8644  PID 25936   <- gateway webhook platform
```

Live probes:

```
$ curl http://127.0.0.1:8642/health
{"status": "ok", "platform": "hermes-agent", "version": "0.20.4"}          # 200, NO auth

$ curl -i http://127.0.0.1:8642/api/sessions?limit=1
HTTP/1.1 401 Unauthorized
Server: Python/3.11 aiohttp/3.14.3
{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}

$ curl http://127.0.0.1:8642/health/detailed   -> 401
$ curl http://127.0.0.1:8642/v1/models         -> 401
$ curl http://127.0.0.1:8642/v1/capabilities   -> 401
$ curl http://127.0.0.1:8642/api/status        -> 404   (that route does not exist on server B)

$ curl http://127.0.0.1:50596/api/status       -> 200, NO auth  (full body in §10.1)
$ curl http://127.0.0.1:50596/api/sessions     -> 401
$ curl http://127.0.0.1:50596/                 -> 404 application/json (headless serve mounts no SPA)
$ curl http://127.0.0.1:50596/health           -> 404 (server A uses /api/health, not /health)
```

`%APPDATA%\Hermes\backend-ownership.json` on this machine (**nonce value redacted by me**):

```json
{
  "backends": [
    {
      "nonce": "<32 hex chars — REDACTED>",
      "pid": 29256,
      "profile": "default",
      "startMarker": "win:639227626285258518",
      "command": "C:\\Users\\<usuario>\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\python.exe -m hermes_cli.main serve --host 127.0.0.1 --port 0",
      "parentPid": 32196,
      "parentStartMarker": "winms:1787165827570"
    }
  ]
}
```

Note the recorded `pid` (29256) is the **launcher**, not the process holding the socket (28636). Any PID→port walk must descend to children.

---

## 2. Q1 — Is Desktop just a GUI, or does it keep its own state?

**It is ~95 % a GUI over the backend, but it keeps a real, non-trivial local layer.** The split:

### 2.1 Lives in the backend (`HERMES_HOME`, shared with CLI/TUI/gateway/Raycast)

- **Sessions + messages + all counters** → `HERMES_HOME/state.db` (`hermes_state.py:349`, `hermes_state.py:379-396`; schema at `hermes_state_common.py:259-318` for `sessions` and `:320-344` for `messages`).
- **Durable per-session flags** `pinned`, `archived`, `hidden`, `last_read_at`, `title` (`hermes_state_common.py:297`, `:312-315`).
- Config (`config.yaml`), env/secrets (`.env`, `auth.json`), skills, MCP servers, toolsets, cron jobs, webhooks, profiles — all read/written through REST against the backend (`apps/desktop/src/hermes.ts`, endpoint inventory in §5.2).

### 2.2 Lives only in Electron `userData` = `%APPDATA%\Hermes` (Windows)

Declared in `apps/desktop/electron/main.ts:759-775` plus scattered later constants:

| File | Purpose | main.ts line |
|---|---|---|
| `connection.json` | v1 desktop connection config (local vs remote; contains encrypted secrets) | `759` |
| `connections.json` | v2 multi-connection registry ("named agent sources") | `764` |
| `desktop-installation.json` | install identity | `765` |
| `updates.json` | update channel/branch | `766` |
| `window-state.json` | window geometry | `767` |
| `backend-ownership.json` | live backend ownership ledger (see §3) | `768` |
| `active-profile.json` | **which Hermes profile Desktop launches its backend as** | `775` |
| `native-theme.json` | theme | `865` |
| `translucency.json` | window translucency | `901` |
| `backend-ready/` | transient ready-file dir (see §3.3) | `2483` |
| `zoom-state.json` | zoom | `2624` |
| `composer-images/` | pasted composer images | `5453` |
| `native-oauth-tokens.json` | native OAuth tokens for remote gateways | `6999` |
| `hud-state.json`, `quick-entry.json`, `data-url-read-max.json`, `keep-awake.json`, `disable-f12.json` | UI prefs | `11147`, `11542`, `13745`, `14124`, `14222` |

The Desktop **log** deliberately goes to the *shared* home, not userData: `HERMES_HOME/logs/desktop.log` (`main.ts:786`).

### 2.3 Lives only in the renderer's `localStorage`

~113 distinct string literals under the `hermes.desktop.*` namespace (counted with `grep -rhoE "'hermes\.desktop\.[a-zA-Z0-9._-]+'" apps/desktop/src | sort -u | wc -l` → 113), e.g. `hermes.desktop.sessionOrder`, `hermes.desktop.sessionColors`, `hermes.desktop.sidebarGrouping`, `hermes.desktop.lastSessionId`, `hermes.desktop.composer.model`, `hermes.desktop.sessionTiles.v2`, `hermes.desktop.inflightTurnJournal.v1`, `hermes.transcript-tail.v1-index`. Persistence helper: `apps/desktop/src/lib/persisted.ts`.

**Consequence for Raycast:** sidebar *ordering, colours, grouping, tile layout, "unread" dot ordering* are Desktop-local and unreachable. Raycast should not try to influence them.

### 2.4 The one genuinely two-way-synced local↔backend field: pins

`apps/desktop/src/store/session-pin-sync.ts:1-22` documents the contract exactly:

> "Pins drive the sidebar UI out of `$pinnedSessionIds` (localStorage), but the durable record is `sessions.pinned` in each profile's state.db… **Push:** PATCH `pinned` whenever the local set changes, and re-assert the whole set at boot… **Pull:** session rows now carry `pinned`… the server row is authoritative: adopt pins this app hasn't seen, and drop local pins the server says are gone."

So **`PATCH /api/sessions/{id} {"pinned": true}` from Raycast will be adopted by Desktop** on its next list refresh. Same file documents a write-fence so an in-flight page can't clobber a fresh write.

---

## 3. Q2 — How Desktop starts and discovers the backend

### 3.1 The command

Two spawn sites, both in `apps/desktop/electron/main.ts`:

- **Primary (window) backend:** args built at `main.ts:10409` as `['serve','--host','127.0.0.1','--port','0']`, with `--profile <name>` unshifted at `main.ts:10415-10419` when `active-profile.json` holds a value.
- **Pooled (per-profile) backend:** args built at `main.ts:10085` as `['--profile', profile, 'serve', '--host','127.0.0.1','--port','0']`.

The canonical arg builder also exists as a pure helper: `apps/desktop/electron/backend-command.ts:18` (`serveBackendArgs`). Old runtimes that predate the `serve` subcommand are rewritten to `dashboard --no-open` (`backend-command.ts:30` `dashboardFallbackArgs`, gated by `sourceDeclaresServe` at `:46`, selected in `main.ts:2221-2223`).

Spawn call: `main.ts:10461-10493` (primary) / `main.ts:10102-10129` (pool), always with `stdio: ['ignore','pipe','pipe']`.

Environment injected into the child (`main.ts:10466-10489`):

| Env var | Value | Why |
|---|---|---|
| `HERMES_HOME` | Electron's resolved home (`main.ts:692-731`) | pins the profile root so Desktop and CLI share one home (`main.ts:10468-10476`) |
| `TERMINAL_CWD` | resolved cwd | pins tool/terminal cwd |
| `HERMES_DASHBOARD_SESSION_TOKEN` | 32 random bytes, base64url (`main.ts:10407`) | the REST/WS session token |
| `HERMES_DESKTOP` | `"1"` | tells the backend it is desktop-spawned → runs the cron scheduler tick loop (`hermes_cli/web_server.py:389-394`, thread started `:408-415`, ticker `_start_desktop_cron_ticker` at `:265`), reaps unsupervised gateway orphans (`:401-406`) and reaps orphaned desktop-local serves (`:19020-19028`). Electron-side rationale comment: `main.ts:10480-10482` |
| `HERMES_PARENT_PID` / `HERMES_PARENT_START_MARKER` / `HERMES_PARENT_NONCE` | from `parentWatchdogEnv` (`apps/desktop/electron/parent-process-identity.ts:66-85`) | parent-death watchdog |
| `HERMES_WEB_DIST` | web bundle dir | SPA assets |
| `HERMES_DESKTOP_READY_FILE` | only when the runtime needs it | ready-file port channel |

### 3.2 Port discovery — **stdout parse is the primary channel**

`--port 0` means the OS assigns the port. The backend prints a sentinel *after* uvicorn's socket is bound:

`hermes_cli/web_server.py:19034-19042`
```python
actual_port = _read_bound_port(server, fallback=port)
app.state.bound_port = actual_port
_write_dashboard_ready_file(actual_port)
ready_token = "HERMES_BACKEND_READY" if headless else "HERMES_DASHBOARD_READY"
print(f"{ready_token} port={actual_port}", flush=True)
```
`_read_bound_port` reads the real bound port off the live socket (`web_server.py:18615-18625`) — no pre-bind TOCTOU.

Electron parses it line-by-line off the child's stdout: `apps/desktop/electron/backend-ready.ts:54-108`, matching
```js
const _READY_RE = /^HERMES_(?:BACKEND|DASHBOARD)_READY port=(\d+)/m   // backend-ready.ts:6
```
Awaited at `main.ts:10574-10578` (primary) and `main.ts:10164` (pool). Deadline: 90 s default, floored at 45 s, overridable with `HERMES_DESKTOP_PORT_ANNOUNCE_TIMEOUT_MS` (`backend-ready.ts:16-35`).

### 3.3 Secondary channel: the ready file (used only for windowless/pythonw launches)

When `backend.readyFile` is set, Electron mints a throwaway path `userData/backend-ready/dashboard-<pid>-<ts>-<rand>.json` (`main.ts:2482-2487`), passes it as `HERMES_DESKTOP_READY_FILE`, and polls it every 50 ms (`backend-ready.ts:125-180`). Python writes it atomically as `{"port": <int>}` (`web_server.py:18628-18664`). **Electron deletes the file immediately after reading it** (`main.ts:10166-10168`, `main.ts:10580-10582`), so it is not a discovery channel for third parties. On this machine the console-python path is used, so no ready file exists at all (`main.ts:2470-2480` explains why).

### 3.4 What is NOT persisted — the blocker for Raycast

- The **port** is never written to any durable file. `backend-ownership.json` stores `{nonce, pid, profile, startMarker, command, parentPid, parentStartMarker}` and nothing else (`apps/desktop/electron/backend-ownership.ts:1-14`, `:88-105`).
- The **session token** is never written to disk (see §4.1).
- The base URL is only ever built in memory: `` const baseUrl = `http://127.0.0.1:${port}` `` (`main.ts:10584`, `main.ts:10172`).

**Practical conclusion:** a Raycast extension *cannot reliably join the Desktop's private backend.* Even if it port-scanned and found `/api/status` (public — §10.1), every other route needs the ephemeral token it cannot obtain. Use server B (`8642`) instead.

### 3.5 Ownership / anti-orphan bookkeeping (context, not an integration point)

After spawn, Electron claims the child in `backend-ownership.json` (`main.ts:3289-3312` → `backend-ownership.ts:125-168`). On startup it reaps orphans, but **never** one whose recorded Electron parent is still alive (`backend-ownership.ts:183-241`, comment at `:189-193`). Commands are matched by regex `backendCommandMatches` (`backend-ownership.ts:249-253`). Teardown is Windows tree-kill / POSIX process-group kill (`apps/desktop/electron/backend-child.ts:58-83`).

---

## 4. Q3 — What auth does Desktop use, and what is the `nonce`?

### 4.1 Desktop → its own backend: an ephemeral session token, not `API_SERVER_KEY`

- Electron mints it: `const token = crypto.randomBytes(32).toString('base64url')` (`main.ts:10407`, pool copy at `main.ts:10058`).
- It is handed to the child as `HERMES_DASHBOARD_SESSION_TOKEN` (`main.ts:10479`).
- Python resolves it *from that env var, else generates a fresh one*:
  `hermes_cli/web_server.py:499-503`
  ```python
  def _resolve_session_token() -> str:
      return os.environ.get("HERMES_DASHBOARD_SESSION_TOKEN") or secrets.token_urlsafe(32)
  _SESSION_TOKEN = _resolve_session_token()
  _SESSION_HEADER_NAME = "X-Hermes-Session-Token"
  ```
  The module comment at `web_server.py:490-495` states plainly: *"Either way it dies when the process exits"*.
- Accepted forms (`web_server.py:567-584`): header `X-Hermes-Session-Token: <token>`, **or** legacy `Authorization: Bearer <token>`. A `?token=` query param is accepted only for `/api/files/download` (`web_server.py:590-597`).
- Electron sends it on every REST call: `'X-Hermes-Session-Token': token` in `fetchJson` (`main.ts:4797`). `Authorization: Bearer` is reserved for OAuth-gated *remote* gateways (`main.ts:4798-4803`).
- WebSocket auth is a query credential: `` `ws://127.0.0.1:${port}/api/ws?token=${encodeURIComponent(authToken)}` `` (`main.ts:10596`), probed before the backend is declared ready (`main.ts:10597-10603`).

**Loopback is not "no auth".** `should_require_auth()` (`web_server.py:641-660`) returns False for loopback, which disables the *OAuth gate*, not the token check — `_require_token` still validates `_SESSION_TOKEN` in that mode (`web_server.py:600-627`). Only the small `PUBLIC_API_PATHS` allowlist bypasses it: `/api/health`, `/api/status`, `/api/config/defaults`, `/api/config/schema`, `/api/model/info`, `/api/dashboard/themes`, `/api/dashboard/plugins`, `/api/cron/fire` (`hermes_cli/dashboard_auth/public_paths.py`).

**Token drift handling (why you cannot scrape it from HTML on a headless backend):** for the *dashboard* (SPA) mode the token is injected into `index.html` as `window.__HERMES_SESSION_TOKEN__ = "…"` and Electron re-reads it (`apps/desktop/electron/dashboard-token.ts:38-50`, `:56-70`, `:88-102`). But `hermes serve` is **headless** — it serves no SPA. Verified live: `GET http://127.0.0.1:50596/` → `404`, `content-type: application/json`. So there is no HTML to scrape.

### 4.2 The `nonce` in `backend-ownership.json` — what it is for

It is **not** an auth credential and it is **not** accepted by any HTTP route.

- Minted per spawn: `const backendNonce = crypto.randomBytes(16).toString('hex')` (`main.ts:10458`, pool copy `main.ts:10099`).
- Passed to the child as `HERMES_PARENT_NONCE` alongside `HERMES_PARENT_PID` and `HERMES_PARENT_START_MARKER` (`apps/desktop/electron/parent-process-identity.ts:66-85`).
- Recorded in the ownership ledger as part of the process identity tuple `{nonce, pid, profile, startMarker}` (`backend-ownership.ts:1-6`), and identity equality requires **all four** to match (`backend-ownership.ts:55-62`). That is what stops a recycled PID from being mistaken for a live backend during orphan reaping.
- Python's only use of it is a plumbing-consistency check in the parent-death watchdog (`hermes_cli/web_server.py:18748-18789`): if the marker is present the nonce must also be present and non-blank, otherwise the watchdog degrades to PID-only tracking. Docstring at `web_server.py:18752-18755`: *"the nonce makes partial/mixed-version identity plumbing fail safe"*. It is the **only** `HERMES_PARENT_NONCE` reference in the entire Python tree (verified by repo-wide grep).

**Raycast must ignore the nonce entirely.** Reading `backend-ownership.json` is useful only to learn `profile` and `pid`.

### 4.3 Raycast → gateway api_server: `API_SERVER_KEY` bearer

`gateway/platforms/api_server.py:1782-1835`:

```python
auth_header = request.headers.get("Authorization", "")
if auth_header.startswith("Bearer "):
    token = auth_header[7:].strip()
    if hmac.compare_digest(token.encode(), expected_key.encode()):
        return None  # Auth OK
```

- Key source: `platforms.api_server.extra.key` in `config.yaml` if set, else the secret scope under key name `API_SERVER_KEY` — `self._api_key = extra.get("key", _get_scoped_secret("API_SERVER_KEY", ""))` (`api_server.py:1383`); named-profile requests re-resolve it through `get_secret("API_SERVER_KEY", "")` (`:1768`). On this machine `extra` holds only `host`/`port` (`config.yaml:555-560`) and the key name is present in `C:\Users\<usuario>\AppData\Local\hermes\.env` (confirmed the *key name* exists; value never read).
- The server **refuses to start** without a strong key: missing/placeholder/<16 chars → non-retryable fatal `api_server_key_invalid` (`api_server.py:7389-7426`, `:7437-7458`).
- Port/host come from `config.yaml` → `platforms.api_server.extra.{host,port}`; on this machine `host: 127.0.0.1`, `port: 8642`, `enabled: true` (`C:\Users\<usuario>\AppData\Local\hermes\config.yaml:555-560`).

---

## 5. Q4 — Every channel and call Desktop actually uses

### 5.1 Channel inventory

| Channel | Where | Notes |
|---|---|---|
| **HTTP REST** (Electron main → backend) | `main.ts:13574` builds the URL, `main.ts:4770-4864` performs the request | The **renderer never fetches REST directly**. It calls `window.hermesDesktop.api(...)` over Electron IPC (`apps/desktop/src/hermes.ts:345-349`), handled by `ipcMain.handle('hermes:api', …)` (`main.ts:13638-13652` → `handleHermesApiRequest`, declared at `main.ts:13506` and ending at `:13636`; the URL is assembled at `:13574`). |
| **JSON-RPC over WebSocket** `/api/ws` | `apps/desktop/src/hermes.ts:237-247` (`HermesGateway extends JsonRpcGatewayClient`); server side `hermes_cli/web_server.py:17084-17100` → `tui_gateway.ws.handle_ws` | This is where *chat actually happens*. Auth via `?token=`. |
| **Plugin WebSocket** `/api/plugins/<id>/…` | `apps/desktop/src/hermes.ts:426-478` (`pluginSocket`) | Renderer opens this one directly, with `?token=` from the connection descriptor. |
| **Electron IPC** (renderer ↔ main) | `main.ts` `ipcMain.handle('hermes:*')` | Internal to the app; not reachable from another process. |
| **`hermes://` deep links** | `main.ts:15264-15374` | **The one cross-process door into a running Desktop** — see §7.3. |
| **`BroadcastChannel('hermes:sessions')`** | `apps/desktop/src/store/session-sync.ts` | Cross-*window* only (same app), not cross-process. |
| **SSE** | not used by Desktop | Desktop uses the WS. SSE exists on server B (`/v1/runs/{id}/events`, `/api/sessions/{id}/chat/stream`). |

Grep evidence that the renderer has exactly **two** direct socket constructions and no `EventSource`: `apps/desktop/src/hermes.ts:444` (pluginSocket) and `apps/desktop/src/lib/voice-playback.ts:152`.

### 5.2 REST endpoints the Desktop calls (full inventory, from grep over `apps/desktop/src`)

Sessions & profiles:
`/api/sessions?limit&offset&min_messages&archived&order`, `/api/sessions/{id}`, `/api/sessions/{id}/messages`, `/api/sessions/search?q`,
`/api/profiles`, `/api/profiles/active`, `/api/profiles/{name}`, `/api/profiles/{name}/soul`, `/api/profiles/{name}/export`, `/api/profiles/{name}/setup-command`, `/api/profiles/import`,
`/api/profiles/sessions`, `/api/profiles/sessions/sidebar`, `/api/profiles/sessions/pull-requests`, `/api/profiles/projects/tree`.

Capabilities & config:
`/api/status`, `/api/config`, `/api/env`, `/api/skills`, `/api/skills/content`, `/api/skills/toggle`, `/api/skills/hub/{search,preview,scan,install,uninstall,update,sources}`,
`/api/tools/toolsets` (+ `/{name}`, `/config`, `/model`, `/models`, `/provider`, `/post-setup`), `/api/tools/terminal/backend(s)`, `/api/tools/computer-use/{status,permissions/grant}`,
`/api/mcp/servers`, `/api/mcp/oauth/flows/{id}`, `/api/model/{info,options,set,moa,auxiliary,recommended-default}`,
`/api/providers/{validate,custom-endpoints…,oauth…}`, `/api/memory/…`, `/api/learning/node`, `/api/messaging/platforms…`, `/api/cron/jobs…`, `/api/webhooks…`, `/api/pairing…`, `/api/ops/{doctor,backup,security-audit,debug-share}`, `/api/plugins/{id}/…`.

### 5.3 JSON-RPC methods the Desktop calls over `/api/ws`

From grep on `requestGateway(...)`: `session.create`, `session.resume`, `session.close`, `session.interrupt`, `session.redirect`, `session.title`, `session.history`, `session.branch`, `session.cwd.set`, `session.context_breakdown`, `session.active_list`, `prompt.submit`, `config.get`, `config.set`, `reload.env`, `slash.exec`, `command.dispatch`, `commands.catalog`, `complete.path`, `file.attach`, `image.attach`, `image.attach_bytes`, `image.detach`, `approvals.mode`, `browser.manage`, `handoff.{request,state,fail}`, `pet.info`, `pet.info.meta`, `preview.restart`, `wake.status`, `wake.stop`.

**Key asymmetry for Raycast:** the Desktop **does not** create chats with `POST /api/sessions`. It calls the RPC `session.create` and the DB row is created **lazily on the first prompt**:

`tui_gateway/methods_session.py:14-16`
```python
@method("session.create")
def _(rid, params: dict) -> dict:
    sid = uuid.uuid4().hex[:8]
```
`tui_gateway/methods_session.py:114-119`
> "we intentionally do NOT persist a DB row here… The row is now created lazily on the first prompt (see `_ensure_session_db_row` + `prompt.submit`)"

Desktop-created sessions therefore have **8-hex-char ids** and `source: 'desktop'` (`apps/desktop/src/app/session/hooks/use-session-actions/index.ts:1512-1517`; source default resolution at `tui_gateway/server.py:3961-3971`).

---

## 6. Q5 — Sessions: where they live, and exactly when a Raycast-created one shows in Desktop

### 6.1 Storage

- **SQLite**, one DB per profile home: `DEFAULT_DB_PATH = get_hermes_home() / "state.db"` (`hermes_state.py:349`; runtime re-resolution `hermes_state.py:379-396`).
- On this machine: `C:\Users\<usuario>\AppData\Local\hermes\state.db` (632 MB + `-wal` + `-shm`). Confirmed by the live `/api/status` field `"hermes_home": "C:\\Users\\<usuario>\\AppData\\Local\\hermes"`.
- Server B opens **exactly that file**: `db = SessionDB(db_path=home / "state.db")` where `home = get_hermes_home()` (`gateway/platforms/api_server.py:2176-2195`, `:2212-2234`, `:2236-2266`). The docstring at `:2213-2216` says: *"Sessions are persisted to `state.db` so that `hermes sessions list` shows API-server conversations alongside CLI and gateway ones."*
- Schema: `hermes_state_common.py:259-318` (`sessions`) and `:320-344` (`messages`). Notable columns: `id`, `source`, `session_key`, `model`, `model_config`, `system_prompt`, `parent_session_id`, `started_at`, `ended_at`, `message_count`, token/cost counters, `cwd`, `git_branch`, `title`, `last_activity_at`, `profile_name`, `archived`, `pinned`, `hidden`, `last_read_at`.

### 6.2 Will a Raycast-created session appear in the Desktop UI?

**Yes — but only if all of these hold.** Each is a real, cited gate:

| # | Condition | Why / citation |
|---|---|---|
| 1 | **Same `HERMES_HOME` / profile** → same `state.db` | `api_server.py:2193`; `hermes_constants.py:114-139`; profile→home mapping `hermes_cli/profiles.py:2472-2492` |
| 2 | **The session has ≥ 1 message** | The primary sidebar fetch is the batched `GET /api/profiles/sessions/sidebar`, whose three slices are hard-coded server-side to `min_messages=1` / `archived=exclude` / recency order (`hermes_cli/web_routers/profiles.py:398-400`); the client-side compatibility fallback passes the same `1` explicitly (`apps/desktop/src/hermes.ts:651`, `:654`, `:655`, comment `:644-648`; rationale comment `use-session-list-actions.ts:250-252`). A bare `POST /api/sessions` row has `message_count = 0` and is invisible. |
| 3 | **`source` is not an excluded source** | Recents excludes `['cron','kanban','subagent','tool', ...MESSAGING_SESSION_SOURCE_IDS]` (`use-session-list-actions.ts:49`), and `MESSAGING_SESSION_SOURCE_IDS` **contains `api_server`** (`apps/desktop/src/lib/session-source.ts:52-73`). With the default source the row lands in the *Messaging* section labelled **"API"** (`session-source.ts:4`) instead of Recents. Send `"source": "desktop"` (allowed values: `api_server, hermes_browser, browser, cli, telegram, discord, slack, desktop, dashboard` — anything else silently becomes `api_server`, `api_server.py:2568-2573`). |
| 4 | **Not archived** (`archived=exclude` is the sidebar default) | `web_routers/profiles.py:398-400`, `hermes.ts:651`; server filter `hermes_cli/web_routers/sessions.py:106-107` |
| 5 | **Within the recency window** (or pinned) | Pinned rows are back-filled past LIMIT (`api_server.py:3412-3414`, `hermes.ts:490-498`) |

### 6.3 Cross-profile listing

`GET /api/profiles/sessions` (server A) aggregates **read-only, straight off each profile's `state.db`**, without spawning per-profile backends, and tags every row with its owning `profile` (`hermes_cli/web_routers/profiles.py:238-245`, `:290-293`). Limits: `limit ≤ 500` here vs `limit ≤ 100` on `/api/sessions` (`web_routers/profiles.py:227`, `web_routers/sessions.py:58`). Server B's `/api/sessions` caps at 200 (`api_server.py:3402`).

---

## 7. Q6 — Profiles

### 7.1 The concept

A profile **is a Hermes home directory**. Resolution (`hermes_cli/profiles.py:2472-2492`):

```
profile "default"      -> HERMES_HOME root            e.g. C:\Users\<usuario>\AppData\Local\hermes
profile "<name>"       -> <root>\profiles\<name>      e.g. …\hermes\profiles\coder   (must already exist, else FileNotFoundError)
```

Everything home-scoped is therefore profile-scoped: `state.db`, `config.yaml`, `.env`, `auth.json`, `skills/`, `cron/`, `desktop-plugins/`, `pairing/`.

Name grammar: `^[a-z0-9][a-z0-9_-]{0,63}$` (`hermes_cli/profiles.py:40`, mirrored in Electron at `main.ts:778`).

### 7.2 How a profile gets selected

Precedence, in `hermes_cli/main.py:518-692` (`_apply_profile_override`, run **before any hermes import**):

1. explicit `--profile <name>` / `-p <name>` / `--profile=<name>` on argv (`main.py:591-600`), validated against the same regex (`main.py:617-623`);
2. else, if `HERMES_HOME` already points at a directory whose parent is literally `profiles`, trust it and stop (`main.py:634-637`);
3. else, the sticky file `<default root>/active_profile` — but only if it names something other than `default` (`main.py:651-662`; file path helper `hermes_cli/profiles.py:296-298`, accessors `:1922-1960`);
4. the resolved value is written back into `os.environ["HERMES_HOME"]` (`main.py:685`).

The Desktop pins step 1 deterministically: `readActiveDesktopProfile()` reads `%APPDATA%\Hermes\active-profile.json` → `{"profile": "<name>"|null}` (`main.ts:8439-8453`, writer `:8455-8466`); `null` means "no preference", so no `--profile` flag is passed and the backend falls through to step 3. `primaryProfileKey()` normalises that to `'default'` for bookkeeping (`main.ts:9650-9652`).

Observed here: no `active-profile.json` and no `active_profile` file → profile `default`, matching `backend-ownership.json` (`"profile": "default"`) and `/api/status` (`"profiles": ["default"]`).

### 7.3 What Raycast must do to be on the same profile

1. Determine the target profile:
   - read `%APPDATA%\Hermes\active-profile.json` → `.profile` (may be `null`);
   - if null, read `<HERMES_HOME>\active_profile` (plain text; absent ⇒ `default`);
   - cross-check against `%APPDATA%\Hermes\backend-ownership.json` → `backends[].profile`.
2. Address it on server B in **one** of two ways:
   - profile is `default` → plain routes: `POST http://127.0.0.1:8642/api/sessions`;
   - named profile → the **multiplex mirror**: every route is also registered under `/p/{profile}` (`api_server.py:7476-7478`):
     ```
     POST http://127.0.0.1:8642/p/coder/api/sessions
     ```
     A profile-prefix middleware redirects `get_hermes_home()` for the request so each profile gets its own DB (`api_server.py:2218-2222`, `:7464`).
     **Caveat:** a named-profile request **fails closed** unless a profile-scoped `API_SERVER_KEY` resolves for it — it will not inherit the default listener's key (`api_server.py:1758-1781`, `:1790-1814`).

---

## 8. Q7 — Is there a plugin/IPC surface Raycast can reuse?

**No local IPC socket, named pipe, or unix socket is exposed to third-party processes.** Findings:

### 8.1 The "plugin socket" is in-app, not inter-process

`pluginSocket(pluginId, path, onMessage)` (`apps/desktop/src/hermes.ts:426-478`) opens a browser `WebSocket` from the **renderer** to the backend at
`ws://127.0.0.1:<ephemeral>/api/plugins/<pluginId><path>?token=<session token>` (`hermes.ts:442-446`).
Its REST twin `pluginRest` (`hermes.ts:403-418`) is namespace-confined by construction — path traversal out of `/api/plugins/<id>` is rejected (`hermes.ts:387-395`). The doc-comment at `hermes.ts:397-402` states the namespace *is* the security boundary. `apps/desktop/src/plugin-socket-scope.test.ts:5-12` only asserts which backend that socket dials.

Both require (a) the ephemeral port and (b) the ephemeral token — the same two things Raycast cannot get.

### 8.2 Plugins are JS bundles loaded inside the app

`apps/desktop/src/plugins/README.md:1-16`: bundled plugins are `<name>/plugin.{ts,tsx}` (default-exporting a `HermesPlugin`, registered by a vite glob in `../contrib/plugins.ts` — README `:3-5`) compiled into the app; user/agent plugins load at runtime from `$HERMES_HOME/desktop-plugins/<name>/plugin.js`. Install tooling clones them from git (`apps/desktop/electron/desktop-plugin-install.ts:1-5`). On this machine `C:\Users\<usuario>\AppData\Local\hermes\desktop-plugins\` and `…\plugins\` are both empty.

> A **Hermes desktop plugin** is a legitimate alternative integration story — it would run *inside* Desktop with full access to `hermesApi`/`pluginSocket`. But that is a Hermes plugin, not a Raycast extension, and it cannot be driven from Raycast. Out of scope for this project unless the plan changes.

### 8.3 The one real cross-process door: `hermes://` deep links

Registered as the OS protocol handler (`main.ts:15358-15374`), delivered into an already-running instance via the single-instance lock + `second-instance` argv on Windows (`main.ts:15376-15392`) or `open-url` on macOS (`main.ts:15409-15411`). Parsing at `main.ts:15290-15339` yields `{kind: url.hostname, name: pathname, params: searchParams}`.

Renderer routing (`apps/desktop/src/app/contrib/hooks/use-desktop-integrations.ts:244-298`):

| URL | Effect |
|---|---|
| `hermes://mcp/install?name=…&config=…` | opens MCP install confirmation (never auto-installs) |
| `hermes://plugin/install?repo=owner/repo[&enable=1][&force=1]` | opens plugin install confirmation (`lib/deeplink-routes.ts:35-43`) |
| `hermes://blueprint/<name>?slot=value` | inserts `/blueprint <name> slot=value` into the composer (`use-desktop-integrations.ts:258-272`) |
| `hermes://open/<path>?…` | in-app navigate to `/<path>` (`lib/hermes-open-target.ts:82-95`) |
| `hermes://<plugin>/<path>` | plugin-scoped navigate (`lib/hermes-open-target.ts:97-108`) |

**Focus-a-session from Raycast.** The session route prefix is `'/'` and `sessionRoute(id) === '/' + encodeURIComponent(id)` (`apps/desktop/src/app/routes.ts:9`, `:184-186`); `routeSessionId` accepts any single-segment path that is not a reserved/contributed route (`app/routes.ts:155-165`). So:

```
hermes://open/<sessionId>
```
navigates the running Desktop to that chat. Constraints from `isSafeAppPath` (`lib/hermes-open-target.ts:51-62`): no `..`, no `\`, no `:`; and `routeSessionId` requires **no `/`** in the id. Both Desktop ids (`uuid4().hex[:8]`) and api_server ids (`api_<epoch>_<8 hex>`) satisfy this.

**UNVERIFIED:** I did not execute a `hermes://open/<id>` link against the running app; this is a source-level derivation. Also unverified: whether Raycast on macOS is permitted to open custom URL schemes without a user prompt in your target setup.

---

## 9. Q8 — The rules for consistent two-way sync

### 9.1 Does Desktop live-refresh a session created externally? **Yes.**

The mechanism is a **file-signature watcher inside the Desktop backend**, not client polling.

`tui_gateway/server.py:3765-3780` — the signature is the newest mtime of `state.db` and `state.db-wal`:
```python
for name in ("state.db", "state.db-wal"):
    mtime = (home / name).stat().st_mtime_ns
    sig = mtime if sig is None else max(sig, mtime)
```
The comment above it (`:3769-3771`) says exactly why: *"processes that never touch this gateway's transports; the shared SQLite file is the one thing they all move (#58671)"* — i.e. this mechanism exists precisely for writers like the api_server.

`tui_gateway/server.py:3837-3843` — watch table, `sessions.changed` polled every **0.5 s**;
`:3849` — broadcasts are floored to **one per 2 s**;
`:3856-3884` — first sighting seeds silently, then any signature move broadcasts a global event;
`:3890-3909` — the watcher runs in a daemon thread started at `gateway.ready` (`tui_gateway/entry.py:447`, `tui_gateway/ws.py:329`), and `gateway.ready` advertises `change_events: true` (`tui_gateway/entry.py:439-440`, `ws.py:320-323`).
`_watcher_home()` (`:3715-3718`) is the active profile home — so it watches the same `state.db` Raycast writes.

Renderer side (`apps/desktop/src/store/live-sync.ts:1-49`): the event increments `$sessionsChangeTick`. `apps/desktop/src/app/contrib/hooks/use-background-sync.ts`:
- `:517-528` — on each tick, throttled to one run per `SESSIONS_LIST_TICK_GAP_MS = 10_000` (`:148`), trailing-edge scheduled;
- `:510-515` — that run does `refreshSessions()` + `refreshMessagingSessions()` + `requestActiveTranscriptRefresh(true)`, so **an open transcript also re-reads its messages**;
- `:453-495` — live status snapshot (`session.active_list`) re-pulled per tick;
- backstop polls when change events are unavailable: `LIVE_SESSION_STATUS_POLL_INTERVAL_MS = 1_500` → `30_000` with events (`:139`, `:143`); cron `30_000` → `5 * 60_000` (`:128-129`); polls pause when the window isn't actually being viewed (`visiblePoll`, `:318-324`).

**Net user-visible latency for a Raycast write to appear in Desktop: ~0.5 s detection + up to 2 s server floor + up to 10 s client throttle ⇒ worst case ≈ 12 s, typical ≈ 1–3 s. If the Desktop window is hidden, the *event* path still fires (it is a socket push, not a visibility-gated poll).**

### 9.2 `/api/platforms/{platform}/events` is NOT an event stream — correction

The task brief suggested checking it for change notifications. It is the opposite: an **ingress webhook** for external messaging platforms to deliver events *into* Hermes. It is authenticated by the target adapter's own platform-signed verifier, explicitly **not** by `API_SERVER_KEY` (`gateway/platforms/api_server.py:2082-2085`, handler `:1873-1930`). Raycast must not use it.

Real streaming options on server B:
- `POST /api/sessions/{id}/chat/stream` — SSE wrapper over one agent turn (`api_server.py:3842-3843`);
- `GET /v1/runs/{run_id}/events` — SSE of structured agent lifecycle events, `Content-Type: text/event-stream` (`api_server.py:7104-7131`); it tolerates subscribing up to ~1 s before the run registers (`:7112-7118`);
- `POST /v1/chat/completions` with `stream: true`.

### 9.3 The rules

**R1 — Talk to `http://127.0.0.1:8642` with `Authorization: Bearer <API_SERVER_KEY>`.**
Read the port from `HERMES_HOME/config.yaml` → `platforms.api_server.extra.port` (default 8642) rather than hardcoding. Read the key from the user's Raycast preferences, or instruct the user to copy it from `HERMES_HOME/.env` (key name `API_SERVER_KEY`). Never attempt to reach the Desktop's ephemeral backend.

**R2 — Resolve `HERMES_HOME` and the profile the same way Hermes does, and stay on that profile.**
`HERMES_HOME` env var → else `%LOCALAPPDATA%\hermes` on Windows / `~/.hermes` elsewhere (`hermes_constants.py:53-59`, `:114-139`). Profile: `%APPDATA%\Hermes\active-profile.json` → `<home>\active_profile` → `default`. For a named profile use the `/p/{profile}/…` prefix (`api_server.py:7478`) **and** make sure that profile has its own `API_SERVER_KEY` (`api_server.py:1758-1781`).

**R3 — Always set `"source": "desktop"` when creating a session you want the user to see in Recents.**
Default `api_server` is filtered out of Recents into the Messaging/"API" section (`session-source.ts:52-73`, `use-session-list-actions.ts:49`, `session-source.ts:4`). Allowed values: `api_server | hermes_browser | browser | cli | telegram | discord | slack | desktop | dashboard`; anything else becomes `api_server` (`api_server.py:2568-2573`).

**R4 — A session is not "real" to the Desktop until it has ≥ 1 message.**
The sidebar queries `min_messages=1` (server-side in the batched route, `hermes_cli/web_routers/profiles.py:398-400`; client-side in the legacy fallback, `hermes.ts:651`). Either create + immediately send the first turn (`POST /api/sessions/{id}/chat`), or skip the create entirely and let the chat endpoint drive. Do **not** create empty placeholder sessions from Raycast — they are invisible to the user but real rows on disk, exactly the "abandoned Untitled" clutter the Desktop's lazy-create fix was written to avoid (`tui_gateway/methods_session.py:114-119`).

**R5 — Mutate durable metadata through `PATCH /api/sessions/{id}`, never by editing `state.db` directly.**
Accepted fields: `title`, `end_reason`, `pinned`, `archived`, `hidden`, `unread` — anything else is a 400 `unsupported_session_field` (`api_server.py:3575-3578`); all **four** boolean flags (`pinned`, `archived`, `hidden`, `unread`) are type-checked and reject non-booleans with 400 `invalid_session_field` (`:3580-3582`). Desktop mirrors these both ways (`apps/desktop/src/hermes.ts:738-771`, reconciliation in `apps/desktop/src/store/session-pin-sync.ts`). Writing SQLite yourself would bypass `set_session_title` uniqueness validation, the FTS/derived bookkeeping, and the WAL/pragma discipline in `hermes_state.py` — and would still fire the mtime watcher, producing an inconsistent UI.

**R6 — Never assume Raycast's local cache is fresh; Desktop's changes reach you only if you re-read.**
There is **no push channel from Hermes to an external HTTP client** for session-list changes (`sessions.changed` is broadcast only on the Desktop backend's `/api/ws`, `tui_gateway/server.py:3882`). Raycast must re-`GET /api/sessions` on view activation, and use React Query/`useCachedPromise` revalidation. A 2–5 s poll while a Raycast list view is in the foreground is the pragmatic equivalent of the Desktop's `sessions.changed`.

**R7 — Respect the id/lifecycle conventions so rows interoperate.**
- api_server-generated ids look like `api_<unix_seconds>_<8 hex>` (`api_server.py:3448`); Desktop ids are `uuid4().hex[:8]` (`tui_gateway/methods_session.py:16`). Either is fine; ids must avoid `\r\n\0`, path-unsafe forms, and stay ≤ 256 chars (`api_server.py:3450-3453`).
- **Do not reuse an id**: a duplicate create returns `409 session_exists` (`api_server.py:3542-3543`).
- Titles are globally unique per DB — a colliding title rolls the whole create back and returns `400 invalid_title` (`api_server.py:3519-3527`, `:3544-3545`).
- To branch rather than fork state manually, use `POST /api/sessions/{id}/fork` — it ends the parent with `end_reason="branched"` and links `parent_session_id`, which is exactly what the Desktop sidebar's nesting expects (`api_server.py:3696-3722`).

**R8 — Deep-link into the Desktop instead of trying to control it.**
`hermes://open/<sessionId>` focuses that chat in a running Desktop (§8.3). This is the correct "Open in Hermes Desktop" action for a Raycast list item. Do not attempt to inject into Desktop's `localStorage`, IPC, or plugin socket.

**R9 — Do not fight the gateway for the same session concurrently.**
Both surfaces write the same rows. Turn-level exclusion exists in the DB (`session_turn_leases`, `compression_locks` — `hermes_state_common.py:386-398`), but there is no cross-surface UI lock. Practical guidance: don't start a Raycast turn on a session id the user is actively streaming in Desktop. `GET /api/status` on the Desktop backend exposes `active_sessions`/`gateway_busy`, but Raycast cannot reach that server — **UNVERIFIED** whether an equivalent busy signal is exposed on server B (`/health/detailed` is auth-gated and I did not inspect its full payload).

**R10 — Degrade gracefully when the gateway is down.**
The `hermes gateway run` process (and therefore port 8642) is **detached** — it is spawned with `HERMES_GATEWAY_DETACHED=1` and its own `HERMES_HOME`, not parented to Electron (`hermes_cli/gateway_windows.py:800-825`; live evidence: PID 25880's parent 25816 no longer exists while Electron is 32196). It therefore survives Desktop quitting — good news for Raycast — but it can also be stopped independently. Probe `GET /health` (public, unauthenticated, `api_server.py:2990-2994`) before every session of work and show a clear "Hermes gateway not running" state. Liveness files if you want richer detail: `HERMES_HOME/gateway.pid`, `HERMES_HOME/gateway_state.json`, `HERMES_HOME/state/gateway.lifecycle.json` (all plain JSON, observed on disk).

---

## 10. Literal payloads

### 10.1 `GET /api/status` — Desktop backend, unauthenticated (live capture, port 50596, 2026-08-19)

```json
{"version":"0.20.4","release_date":"2026.8.18","config_version":37,"latest_config_version":37,"can_update_hermes":true,"gateway_running":true,"gateway_state":"running","gateway_platforms":{"api_server":{"state":"connected","error_code":null,"error_message":null,"updated_at":"2026-08-19T11:54:38.458449+00:00"},"webhook":{"state":"connected","error_code":null,"error_message":null,"updated_at":"2026-08-19T11:54:38.468761+00:00"}},"gateway_exit_reason":null,"gateway_updated_at":"2026-08-19T11:54:38.480444+00:00","active_agents":0,"gateway_busy":false,"gateway_drainable":true,"restart_drain_timeout":180.0,"active_sessions":0,"auth_required":false,"auth_providers":[],"auth_flows":[],"nous_session_valid":"unknown","install_id":"0bd29ccb96f747fca93e017bcf4140a2","components":{"gateway":{"status":"ok","state":"running"},"dashboard":{"status":"ok","recent_unhandled_errors":0,"last_error_at":null,"selftest":"ok"},"storage":{"status":"ok"},"platforms":{"status":"ok","configured":2,"connected":2}},"overall":"ok","memory":{"pressure":"unknown","gateway_rss_mb":null,"system_total_mb":null,"system_available_mb":null,"swap_used_mb":null,"sampled_at":null,"last_boot_unclean":true,"last_boot_suspected_oom":false,"boot_id":"2026-08-19T11:54:33.644874+00:00"},"disk":{"pressure":"ok","total_mb":487306,"free_mb":91356,"used_percent":81.3},"profiles":["default"],"gateway_mode":"single","hermes_home":"C:\\Users\\<usuario>\\AppData\\Local\\hermes","config_path":"C:\\Users\\<usuario>\\AppData\\Local\\hermes\\config.yaml","env_path":"C:\\Users\\<usuario>\\AppData\\Local\\hermes\\.env","gateway_pid":25936,"gateway_health_url":null,"gateways":[{"profile":"default","ports":{"api_server":8642,"webhook":8644}}]}
```

Useful fields: `hermes_home`, `profiles`, `gateways[].ports.api_server` (= where Raycast should talk), `gateway_running`.

### 10.2 `GET /health` — gateway api_server, unauthenticated (live capture, port 8642)

```json
{"status": "ok", "platform": "hermes-agent", "version": "0.20.4"}
```
Source: `gateway/platforms/api_server.py:2990-2994`.

### 10.3 401 body shape (live capture, port 8642)

```json
{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}
```
Source: `api_server.py:1832-1835`.

### 10.4 `POST /api/sessions` — create (server B)

Request — **the shape Raycast should send**:
```json
{
  "id": "raycast_20260819_1a2b3c4d",
  "title": "Refactor the billing module",
  "source": "desktop",
  "system_prompt": "You are helping inside Raycast.",
  "model": "anthropic/claude-opus-4",
  "provider": "openrouter"
}
```
Field handling: `id` or `session_id`, else auto `api_<epoch>_<8hex>` (`api_server.py:3447-3448`); `system_prompt` must be a string (`:3455-3457`); `source` normalised (`:3458`, `:2568-2573`); `model`/`provider`/`model_options` folded into a `model_config.browser_model_lock` block (`:3476-3487`); `title` sanitised + uniqueness-checked with rollback (`:3516-3531`).

Response `201`:
```json
{
  "object": "hermes.session",
  "session": {
    "id": "raycast_20260819_1a2b3c4d",
    "source": "desktop",
    "user_id": null,
    "model": "claude-opus-4",
    "title": "Refactor the billing module",
    "started_at": 1787140800.123,
    "ended_at": null,
    "end_reason": null,
    "message_count": 0,
    "tool_call_count": 0,
    "input_tokens": 0,
    "output_tokens": 0,
    "cache_read_tokens": 0,
    "cache_write_tokens": 0,
    "reasoning_tokens": 0,
    "estimated_cost_usd": null,
    "actual_cost_usd": null,
    "api_call_count": 0,
    "parent_session_id": null,
    "last_active": null,
    "preview": null,
    "pinned": false,
    "archived": false,
    "hidden": false,
    "has_system_prompt": true,
    "has_model_config": true
  }
}
```
Projection defined by `_session_response` (`api_server.py:3330-3349`); envelope at `:3546` (status `201`). Note the projection copies only keys the DB row actually has, and its `safe_keys` tuple also includes `_lineage_root_id`, which can appear on list rows (`:3332-3339`). Errors: `409 session_exists` (`:3542-3543`), `400 invalid_title` (`:3544-3545`), `400 invalid_session_id` (`:3450-3453`), `503 session_db_unavailable` (`:3444-3445`).

### 10.5 `GET /api/sessions?limit=50&offset=0` — list (server B)

```json
{
  "object": "list",
  "data": [ { "...": "same per-session projection as §10.4" } ],
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```
Envelope at `api_server.py:3419-3425`. Query params: `limit` (default 50, max 200 — `:3402`), `offset` (max 1 000 000 — `:3403`), `source` (`:3404`), `include_children` (`:3405`). Ordering is always `order_by_last_active=True` with pinned back-fill (`:3411-3414`); `has_more` counts only non-pinned rows (`:3418`).

### 10.6 `POST /api/sessions/{id}/chat` — one synchronous turn (server B)

Request:
```json
{
  "message": "Summarise the last three commits",
  "system_message": "Answer concisely.",
  "model": "anthropic/claude-opus-4"
}
```
`message` or `input` is required and must have visible payload, else `400 missing_message` (`api_server.py:798-810`). `system_message` or `instructions`, must be a string (`:3740-3742`). Optional header `X-Hermes-Session-Key: <stable channel id>` scopes long-term memory and **requires** the API key (`:2120-2143`, max 256 chars `:2118`).

Response `200`:
```json
{
  "object": "hermes.session.chat.completion",
  "session_id": "raycast_20260819_1a2b3c4d",
  "message": { "role": "assistant", "content": "…" },
  "usage": { "...": "provider usage block" },
  "runtime": { "...": "sanitized model/provider/route metadata" }
}
```
Envelope `api_server.py:3830-3838`. Response headers: `X-Hermes-Session-Id` always, `X-Hermes-Session-Key` when supplied (`:3810-3812`).

### 10.7 `GET /api/sessions/{id}/messages` — transcript (server B)

```json
{
  "object": "list",
  "session_id": "raycast_20260819_1a2b3c4d",
  "data": [
    {
      "id": 91823,
      "session_id": "raycast_20260819_1a2b3c4d",
      "role": "user",
      "content": "Summarise the last three commits",
      "tool_call_id": null,
      "tool_calls": null,
      "tool_name": null,
      "timestamp": 1787140801.44,
      "token_count": 12,
      "finish_reason": null,
      "reasoning": null,
      "reasoning_content": null
    }
  ],
  "pagination": { "limit": 500, "offset": 0, "order": "latest", "returned": 1 }
}
```
Envelope `api_server.py:3665-3675`; message projection `_message_response` `:3352-3358`. `order` ∈ {`oldest`,`latest`}; omitting `limit` gives the latest 500 (`:3655-3657`). The id is resolved through `resolve_resume_session_id` first, so a compressed/rotated session still returns its live transcript (`:3628`).

### 10.8 `PATCH /api/sessions/{id}` — metadata (server B)

```json
{ "title": "Billing refactor", "pinned": true, "archived": false, "unread": false }
```
Response:
```json
{ "object": "hermes.session", "session": { "...": "projection as §10.4" } }
```
`api_server.py:3575-3603`. `unread:false` writes the read watermark via `set_session_read` (`:3598-3599`).

### 10.9 `DELETE /api/sessions/{id}`

```json
{ "object": "hermes.session.deleted", "id": "raycast_20260819_1a2b3c4d", "deleted": true }
```
`api_server.py:3616`. `deleted` is `bool(db.delete_session(...))`, so a 200 with `"deleted": false` is possible; a missing row 404s earlier via `_get_existing_session_or_404` (`:3611-3613`).

### 10.10 `POST /api/sessions/{id}/fork`

```json
{ "object": "hermes.session", "session": { "...": "the new child session" } }
```
`api_server.py:3722` (status `201`). Note the fork is always stamped `source="api_server"` regardless of the parent's source (`:3701-3707`, literal at `:3703`) — if the fork should appear in Desktop Recents, follow it with `PATCH`… actually `source` is **not** patchable (`:3575`), so prefer creating a new session with `source:"desktop"` and seeding history yourself when Recents visibility matters. **UNVERIFIED:** whether any endpoint can change a session's `source` after creation — I found none.

### 10.11 Desktop's own `session.create` RPC (for reference — Raycast cannot call this)

```json
{ "id": 7, "method": "session.create", "params": { "cols": 96, "source": "desktop", "cwd": "C:/repo", "profile": "default" } }
```
`apps/desktop/src/app/session/hooks/use-session-actions/index.ts:1512-1517`; handler `tui_gateway/methods_session.py:14-112`. Returns `{session_id, stored_session_id?}` — `stored_session_id` stays null until the first prompt persists a row (`use-session-actions/index.ts:578-586`).

### 10.12 `%APPDATA%\Hermes\backend-ownership.json` shape

```json
{ "backends": [ { "nonce": "<redacted>", "pid": 0, "profile": "default", "startMarker": "win:…", "command": "…", "parentPid": 0, "parentStartMarker": "winms:…" } ] }
```
Serializer `apps/desktop/electron/backend-ownership.ts:115-117`; parser tolerates a bare array too (`:73-77`).

---

## 11. Reference: file map for a follow-up agent

| Concern | File |
|---|---|
| Backend spawn, port wait, REST proxy, deep links | `apps\desktop\electron\main.ts` |
| Port announcement parsing | `apps\desktop\electron\backend-ready.ts` |
| Ownership ledger | `apps\desktop\electron\backend-ownership.ts` |
| Argv builder / legacy fallback | `apps\desktop\electron\backend-command.ts` |
| Parent-identity env (nonce) | `apps\desktop\electron\parent-process-identity.ts` |
| SPA token adoption | `apps\desktop\electron\dashboard-token.ts` |
| Renderer API client + plugin doors | `apps\desktop\src\hermes.ts` |
| Session source classification | `apps\desktop\src\lib\session-source.ts` |
| Sidebar fetch policy | `apps\desktop\src\app\session\hooks\use-session-list-actions.ts` |
| Change-event consumption / polls | `apps\desktop\src\app\contrib\hooks\use-background-sync.ts`, `src\store\live-sync.ts` |
| Pin two-way reconciliation | `apps\desktop\src\store\session-pin-sync.ts` |
| Routes / deep-link targets | `apps\desktop\src\app\routes.ts`, `src\lib\hermes-open-target.ts`, `src\lib\deeplink-routes.ts` |
| Desktop backend HTTP server + auth | `hermes_cli\web_server.py` |
| Public path allowlist | `hermes_cli\dashboard_auth\public_paths.py` |
| `/api/sessions` (server A) | `hermes_cli\web_routers\sessions.py` |
| Cross-profile session aggregation | `hermes_cli\web_routers\profiles.py` |
| Profile resolution | `hermes_cli\main.py` (`_apply_profile_override`), `hermes_cli\profiles.py` |
| Home resolution | `hermes_constants.py` |
| Session store + schema | `hermes_state.py`, `hermes_state_common.py` |
| **Gateway API server (Raycast's target)** | `gateway\platforms\api_server.py` |
| Change watcher / `sessions.changed` | `tui_gateway\server.py` |
| `session.create` RPC | `tui_gateway\methods_session.py` |

---

## 12. Open items / UNVERIFIED

1. **UNVERIFIED** — I did not fire a `hermes://open/<sessionId>` link at the running Desktop; §8.3 is derived from source only.
2. **UNVERIFIED** — the full payload of `GET /health/detailed` on server B (auth-gated; I hold no key). If it carries `gateway_busy`/`active_agents`, it would satisfy R9 cleanly.
3. **UNVERIFIED** — whether an authenticated request to server B can discover `hermes_home` / the active profile the way server A's `/api/status` does. Assume not; read the filesystem instead.
4. **UNVERIFIED** — exact spawn site that launched this machine's `hermes gateway run` (its parent PID 25816 no longer exists). The Windows detached-spawn builder is `hermes_cli\gateway_windows.py:785-825`; who invokes it in the Desktop flow was not traced.
5. **UNVERIFIED** — behaviour of the `/p/{profile}/…` multiplex mirror against a real named profile (this machine has only `default`), including whether a profile-scoped `API_SERVER_KEY` must live in that profile's own `.env`.
6. **UNVERIFIED** — whether writing to `state.db` while the Desktop backend holds it in WAL mode from another process ever produces user-visible lock errors under load. The code paths use `BEGIN IMMEDIATE` + WAL and are designed for multi-process access (`SessionDB._execute_write` at `hermes_state.py:3967-3972`, literal `BEGIN IMMEDIATE` at `hermes_state.py:2231`; WAL helper `apply_wal_with_fallback` at `hermes_state.py:1064`; api_server's atomic create at `api_server.py:3495-3539`), but I ran no concurrency test.
7. **Not investigated** — `/api/jobs`, `/v1/runs`, `/v1/responses` semantics (covered by sibling docs `04-runs-and-events.md`, `05-jobs-and-cron.md`).
