# Hermes API — Discovery Endpoints (capabilities, models, skills, toolsets)

**Research date:** 2026-08-19
**Hermes version observed live:** `0.20.4` (from `GET http://127.0.0.1:8642/health`)
**Source tree (read-only reference):** `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent`
**Primary file:** `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\gateway\platforms\api_server.py`

> Every claim below carries a `file:line` citation or is labeled as an observed HTTP response.
> Anything not verifiable is explicitly marked **UNVERIFIED**.

> **Adversarial fact-check pass — 2026-08-19.** Every route path, field name, status code, string
> literal and line citation in this document was re-verified against the Hermes 0.20.4 source tree
> and the live server on :8642. Corrections applied in place (see §7.4 for the most important one:
> `/health/detailed` **does** require auth, contrary to the original draft). Line citations now
> resolve to within ±2 lines of the cited construct; where the original draft pointed at the wrong
> function entirely, the citation was replaced, not merely nudged. Response *bodies* are still
> reconstructions from source literals — no authenticated call was made (see §9).

---

## 0. Ground facts about the running server

### 0.1 Live probes actually performed

```
$ curl -s http://127.0.0.1:8642/health
{"status": "ok", "platform": "hermes-agent", "version": "0.20.4"}
HTTP 200
```

```
$ curl -s http://127.0.0.1:8644/health
{"status": "ok", "platform": "webhook"}
HTTP 200
```

**Port 8644 is the `webhook` platform adapter, NOT the API server.** It returns `404: Not Found`
(plain text, FastAPI/aiohttp default) for `/v1/capabilities` and `/api/model/options`. Only **8642**
serves the API-server surface on this machine.

All five discovery endpoints on 8642 were probed without an `Authorization` header. All five
returned **HTTP 401** with this exact body:

```json
{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}
```

That literal envelope is produced at `gateway/platforms/api_server.py:1832-1835`.

Therefore all response *bodies* documented below are reconstructed **from the source dict literals**,
not from live authenticated calls. Each is labeled.

### 0.2 Authentication

- Every one of the five discovery handlers begins with `auth_err = self._check_auth(request)`
  (`api_server.py:3062`, `:3111`, `:3147`, `:3238`, `:3266`).
- `_check_auth` (`api_server.py:1782-1834`) reads the `Authorization` header, requires the
  `Bearer ` prefix, and does a timing-safe `hmac.compare_digest` on the UTF-8 bytes
  (`api_server.py:1816-1826`; the `hmac.compare_digest` call is at `:1825`).
- Header form: `Authorization: Bearer <API_SERVER_KEY>`.
- The key is resolved by `_expected_api_key()` (`api_server.py:1758-1780`), which for the default
  profile just returns `self._api_key`, set in `__init__` at `api_server.py:1383`:
  `extra.get("key", _get_scoped_secret("API_SERVER_KEY", ""))`.

**Where the key lives on THIS machine (path + name only — value never read):**

| What | Location | Key name |
|---|---|---|
| Secret value | `C:\Users\<usuario>\AppData\Local\hermes\.env` | `API_SERVER_KEY` (verified present; value never opened) |
| Optional config override | `C:\Users\<usuario>\AppData\Local\hermes\config.yaml` | `platforms.api_server.extra.key` (**not set** in the live config) |

Live config block, verified (contains no secret):

```yaml
platforms:
  api_server:
    enabled: true
    extra:
      host: 127.0.0.1
      port: 8642
```

Because `extra.key` is absent, `_api_key` is sourced from `.env`'s `API_SERVER_KEY`, and
`_check_auth` fails closed for unauthenticated requests — matching the observed 401s.

- The server refuses to start at all without a sufficiently strong `API_SERVER_KEY`
  (`api_server.py:7389-7421`), so in practice `auth.required` is always `true` in production.

### 0.3 CORS / preflight

- `_CORS_HEADERS` (`api_server.py:989-992`):
  ```python
  _CORS_HEADERS = {
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
  }
  ```
- `cors_middleware` (`api_server.py:996-1016`): if an `Origin` header is present and the adapter's
  `_origin_allowed()` says no, the request is rejected **403 with an empty body** *before* the
  handler runs. `OPTIONS` with a disallowed origin is also 403.
- `_origin_allowed` (`api_server.py:1691-1698`): **no `Origin` header → allowed** (non-browser
  clients). With an `Origin` and `_cors_origins` empty → **denied**.
- Allowed origins come from `extra.cors_origins` or env `API_SERVER_CORS_ORIGINS`
  (`api_server.py:1384-1386`). The live config sets neither → `cors: false` in `/v1/capabilities`,
  and **any browser fetch with an `Origin` header gets 403**.

> **Raycast implication:** Raycast extensions run in Node (no `Origin` header) so this is fine.
> A browser-based client would need `API_SERVER_CORS_ORIGINS` configured first.

### 0.4 Profile URL mirrors

Every route in the table is registered twice (`api_server.py:7476-7478`):

```python
for method, path, handler in self._http_route_table():
    self._app.router.add_route(method, path, handler)
    self._app.router.add_route(method, f"/p/{{profile}}{path}", handler)
```

So `GET /p/<profile>/v1/capabilities` also exists. An unknown profile prefix returns
**404** `{"error": "Unknown or unconfigured profile"}` (`api_server.py:2041`).
Multiplexing is **not** enabled in the live `config.yaml` (no `gateway.multiplex_profiles` key found),
so the plain paths are the correct ones to use.

### 0.5 The full route table (ground truth)

`api_server.py:2053-2105` — `_http_route_table()`. Reproduced verbatim (method, path, handler):

```python
routes: List[tuple] = [
    ("GET",    "/health",                                    self._handle_health),
    ("GET",    "/health/detailed",                           self._handle_health_detailed),
    ("GET",    "/v1/health",                                 self._handle_health),
    ("GET",    "/v1/models",                                 self._handle_models),
    ("GET",    "/api/model/options",                         self._handle_model_options),
    ("GET",    "/v1/capabilities",                           self._handle_capabilities),
    ("GET",    "/v1/skills",                                 self._handle_skills),
    ("GET",    "/v1/toolsets",                               self._handle_toolsets),
    ("GET",    "/api/sessions",                              self._handle_list_sessions),
    ("POST",   "/api/sessions",                              self._handle_create_session),
    ("GET",    "/api/sessions/{session_id}",                 self._handle_get_session),
    ("PATCH",  "/api/sessions/{session_id}",                 self._handle_patch_session),
    ("DELETE", "/api/sessions/{session_id}",                 self._handle_delete_session),
    ("GET",    "/api/sessions/{session_id}/messages",        self._handle_session_messages),
    ("POST",   "/api/sessions/{session_id}/fork",            self._handle_fork_session),
    ("POST",   "/api/sessions/{session_id}/chat",            self._handle_session_chat),
    ("POST",   "/api/sessions/{session_id}/chat/stream",     self._handle_session_chat_stream),
    ("POST",   "/api/sessions/{session_id}/model",           self._handle_session_model_lock),
    ("POST",   "/v1/chat/completions",                       self._handle_chat_completions),
    ("POST",   "/v1/responses",                              self._handle_responses),
    ("GET",    "/v1/responses/{response_id}",                self._handle_get_response),
    ("DELETE", "/v1/responses/{response_id}",                self._handle_delete_response),
    ("POST",   "/api/platforms/{platform}/events",           self._handle_platform_event_callback),
    ("GET",    "/api/jobs",                                  self._handle_list_jobs),
    ("POST",   "/api/jobs",                                  self._handle_create_job),
    ("GET",    "/api/jobs/{job_id}",                         self._handle_get_job),
    ("PATCH",  "/api/jobs/{job_id}",                         self._handle_update_job),
    ("DELETE", "/api/jobs/{job_id}",                         self._handle_delete_job),
    ("POST",   "/api/jobs/{job_id}/pause",                   self._handle_pause_job),
    ("POST",   "/api/jobs/{job_id}/resume",                  self._handle_resume_job),
    ("POST",   "/api/jobs/{job_id}/run",                     self._handle_run_job),
    ("POST",   "/v1/runs",                                   self._handle_runs),
    ("GET",    "/v1/runs/{run_id}",                          self._handle_get_run),
    ("GET",    "/v1/runs/{run_id}/events",                   self._handle_run_events),
    ("POST",   "/v1/runs/{run_id}/approval",                 self._handle_run_approval),
    ("POST",   "/v1/runs/{run_id}/steer",                    self._handle_steer_run),
    ("POST",   "/v1/runs/{run_id}/stop",                     self._handle_stop_run),
]
if _CRON_AVAILABLE:
    routes.append(("POST", "/api/cron/fire", self._handle_cron_fire))
```

**Note the discrepancy** (important, see §7): `/api/jobs*` routes are registered, but
`/v1/capabilities` hard-codes `"jobs_admin": False`.

---

## 1. `GET /v1/capabilities` — the feature-detection endpoint

**Handler:** `APIServerAdapter._handle_capabilities`
**Location:** `gateway/platforms/api_server.py:3140-3224`
**Method:** `GET`
**Query params:** **none** (the handler reads no `request.query` at all)
**Request body:** none
**Auth:** required (`Bearer`) — `api_server.py:3148-3150`
**Status:** always `200` on success; `401` on bad/missing key. There is no try/except, so an
unexpected exception would surface as aiohttp's default 500. **UNVERIFIED** whether any input can
trigger that — the handler touches only instance attributes.

### 1.1 The exact Python dict literal from source

`api_server.py:3152-3224`:

```python
return web.json_response({
    "object": "hermes.api_server.capabilities",
    "platform": "hermes-agent",
    "model": self._model_name,
    "auth": {
        "type": "bearer",
        "required": bool(self._api_key),
    },
    "runtime": {
        "mode": "server_agent",
        "tool_execution": "server",
        "split_runtime": False,
        "description": (
            "The API server creates a server-side Hermes AIAgent; "
            "tools execute on the API-server host unless a future "
            "explicit split-runtime mode is enabled."
        ),
    },
    "features": {
        "chat_completions": True,
        "chat_completions_streaming": True,
        "responses_api": True,
        "responses_streaming": True,
        "run_submission": True,
        "run_status": True,
        "run_events_sse": True,
        "run_stop": True,
        "run_steer": True,
        "run_approval_response": True,
        "tool_progress_events": True,
        "approval_events": True,
        "session_resources": True,
        "model_options": True,
        "session_chat": True,
        "session_chat_streaming": True,
        "session_fork": True,
        "session_model_lock": True,
        "admin_config_rw": False,
        "jobs_admin": False,
        "memory_write_api": False,
        "skills_api": True,
        "audio_api": False,
        "realtime_voice": False,
        "session_continuity_header": "X-Hermes-Session-Id",
        "session_key_header": "X-Hermes-Session-Key",
        "cors": bool(self._cors_origins),
    },
    "endpoints": {
        "health": {"method": "GET", "path": "/health"},
        "health_detailed": {"method": "GET", "path": "/health/detailed"},
        "models": {"method": "GET", "path": "/v1/models"},
        "model_options": {"method": "GET", "path": "/api/model/options"},
        "chat_completions": {"method": "POST", "path": "/v1/chat/completions"},
        "responses": {"method": "POST", "path": "/v1/responses"},
        "runs": {"method": "POST", "path": "/v1/runs"},
        "run_status": {"method": "GET", "path": "/v1/runs/{run_id}"},
        "run_events": {"method": "GET", "path": "/v1/runs/{run_id}/events"},
        "run_approval": {"method": "POST", "path": "/v1/runs/{run_id}/approval"},
        "run_steer": {"method": "POST", "path": "/v1/runs/{run_id}/steer"},
        "run_stop": {"method": "POST", "path": "/v1/runs/{run_id}/stop"},
        "skills": {"method": "GET", "path": "/v1/skills"},
        "toolsets": {"method": "GET", "path": "/v1/toolsets"},
        "sessions": {"method": "GET", "path": "/api/sessions"},
        "session_create": {"method": "POST", "path": "/api/sessions"},
        "session": {"method": "GET", "path": "/api/sessions/{session_id}"},
        "session_update": {"method": "PATCH", "path": "/api/sessions/{session_id}"},
        "session_delete": {"method": "DELETE", "path": "/api/sessions/{session_id}"},
        "session_messages": {"method": "GET", "path": "/api/sessions/{session_id}/messages"},
        "session_fork": {"method": "POST", "path": "/api/sessions/{session_id}/fork"},
        "session_chat": {"method": "POST", "path": "/api/sessions/{session_id}/chat"},
        "session_chat_stream": {"method": "POST", "path": "/api/sessions/{session_id}/chat/stream"},
        "session_model_lock": {"method": "POST", "path": "/api/sessions/{session_id}/model"},
    },
})
```

### 1.2 Literal example response for THIS machine

Derived from the dict above plus the verified live config
(`extra.key` unset → `_api_key` from `.env` → truthy → `required: true`;
`cors_origins` unset → `cors: false`;
`_resolve_model_name("")` → `"hermes-agent"`, see §2.3).

```json
{
  "object": "hermes.api_server.capabilities",
  "platform": "hermes-agent",
  "model": "hermes-agent",
  "auth": {
    "type": "bearer",
    "required": true
  },
  "runtime": {
    "mode": "server_agent",
    "tool_execution": "server",
    "split_runtime": false,
    "description": "The API server creates a server-side Hermes AIAgent; tools execute on the API-server host unless a future explicit split-runtime mode is enabled."
  },
  "features": {
    "chat_completions": true,
    "chat_completions_streaming": true,
    "responses_api": true,
    "responses_streaming": true,
    "run_submission": true,
    "run_status": true,
    "run_events_sse": true,
    "run_stop": true,
    "run_steer": true,
    "run_approval_response": true,
    "tool_progress_events": true,
    "approval_events": true,
    "session_resources": true,
    "model_options": true,
    "session_chat": true,
    "session_chat_streaming": true,
    "session_fork": true,
    "session_model_lock": true,
    "admin_config_rw": false,
    "jobs_admin": false,
    "memory_write_api": false,
    "skills_api": true,
    "audio_api": false,
    "realtime_voice": false,
    "session_continuity_header": "X-Hermes-Session-Id",
    "session_key_header": "X-Hermes-Session-Key",
    "cors": false
  },
  "endpoints": {
    "health": {"method": "GET", "path": "/health"},
    "health_detailed": {"method": "GET", "path": "/health/detailed"},
    "models": {"method": "GET", "path": "/v1/models"},
    "model_options": {"method": "GET", "path": "/api/model/options"},
    "chat_completions": {"method": "POST", "path": "/v1/chat/completions"},
    "responses": {"method": "POST", "path": "/v1/responses"},
    "runs": {"method": "POST", "path": "/v1/runs"},
    "run_status": {"method": "GET", "path": "/v1/runs/{run_id}"},
    "run_events": {"method": "GET", "path": "/v1/runs/{run_id}/events"},
    "run_approval": {"method": "POST", "path": "/v1/runs/{run_id}/approval"},
    "run_steer": {"method": "POST", "path": "/v1/runs/{run_id}/steer"},
    "run_stop": {"method": "POST", "path": "/v1/runs/{run_id}/stop"},
    "skills": {"method": "GET", "path": "/v1/skills"},
    "toolsets": {"method": "GET", "path": "/v1/toolsets"},
    "sessions": {"method": "GET", "path": "/api/sessions"},
    "session_create": {"method": "POST", "path": "/api/sessions"},
    "session": {"method": "GET", "path": "/api/sessions/{session_id}"},
    "session_update": {"method": "PATCH", "path": "/api/sessions/{session_id}"},
    "session_delete": {"method": "DELETE", "path": "/api/sessions/{session_id}"},
    "session_messages": {"method": "GET", "path": "/api/sessions/{session_id}/messages"},
    "session_fork": {"method": "POST", "path": "/api/sessions/{session_id}/fork"},
    "session_chat": {"method": "POST", "path": "/api/sessions/{session_id}/chat"},
    "session_chat_stream": {"method": "POST", "path": "/api/sessions/{session_id}/chat/stream"},
    "session_model_lock": {"method": "POST", "path": "/api/sessions/{session_id}/model"}
  }
}
```

### 1.3 Every key, and what it gates

#### Top level

| Key | Type | Source | Meaning / what it gates |
|---|---|---|---|
| `object` | `string` const `"hermes.api_server.capabilities"` | `api_server.py:3153` | Envelope discriminator. Use it to confirm you're talking to a Hermes API server and not some other OpenAI-compatible proxy. |
| `platform` | `string` const `"hermes-agent"` | `api_server.py:3154` | Adapter identity. Constant — do not use for versioning. |
| `model` | `string` | `api_server.py:3155` = `self._model_name` | The **virtual** model id that `/v1/models` advertises. Echoing this back as a request's `model` means "use the gateway default" and is explicitly nulled out server-side (`api_server.py:2388-2398`). Use it to populate a default model label; never send it as a real provider model id. |
| `auth` | `object` | `api_server.py:3156-3159` | See below. |
| `runtime` | `object` | `api_server.py:3160-3169` | See below. |
| `features` | `object` | `api_server.py:3170-3198` | The progressive-feature-detection map. |
| `endpoints` | `object` | `api_server.py:3199-3223` | Path template registry — use these instead of hardcoding paths. |

#### `auth`

| Key | Type | Value | Gates |
|---|---|---|---|
| `auth.type` | `string` | Always the literal `"bearer"` (`api_server.py:3157`) | Tells the client the scheme is `Authorization: Bearer <key>`. There is no other scheme in this codebase. |
| `auth.required` | `bool` | `bool(self._api_key)` (`api_server.py:3158`) | `true` → every endpoint except `GET /health` and `GET /v1/health` needs a key. **Correction:** `/health/detailed` **does** require the key — its handler calls `_check_auth` at `api_server.py:3003` (verified live: unauthenticated `GET /health/detailed` on :8642 → **401**). `false` only occurs in tests/manual wiring for the default profile (`api_server.py:1786-1789`); named profiles fail closed regardless (`api_server.py:1793-1814`). **A client that gets `required: false` back has, by definition, already authenticated or is on a keyless test server.** |

> **Chicken-and-egg note for the extension:** `/v1/capabilities` itself requires the key. You cannot
> read `auth.required` before authenticating. Use `GET /health` (no auth — `_handle_health`, `api_server.py:2990-2994`) to
> confirm the server exists, then `GET /v1/capabilities` with the key to validate the key AND do
> feature detection in one round-trip. A 401 from `/v1/capabilities` = bad key.

#### `runtime`

| Key | Type | Value | Gates |
|---|---|---|---|
| `runtime.mode` | `string` | const `"server_agent"` (`api_server.py:3161`) | The API server spins up a server-side `AIAgent`. |
| `runtime.tool_execution` | `string` | const `"server"` (`api_server.py:3162`) | **Tools run on the API-server host, not the client.** A Raycast extension must NOT try to execute tool calls locally. |
| `runtime.split_runtime` | `bool` | const `False` (`api_server.py:3163`) | Reserved for a future client-side-tool mode. If a future Hermes flips this to `true`, the client would be expected to execute tools. Treat `false` as "server does everything". |
| `runtime.description` | `string` | fixed prose (`api_server.py:3164-3168`) | Human-readable restatement of the above. Do not parse. |

#### `features` — the progressive-detection map

Every value below is a **hard-coded literal** in the source (they do not vary with config), except
the three noted. A future Hermes version can flip any of them, which is exactly why feature detection
exists.

| Key | Value @0.20.4 | Line | Gates which endpoint / behavior |
|---|---|---|---|
| `chat_completions` | `true` | 3171 | `POST /v1/chat/completions` (OpenAI Chat Completions shape). |
| `chat_completions_streaming` | `true` | 3172 | `POST /v1/chat/completions` with `{"stream": true}` → SSE. |
| `responses_api` | `true` | 3173 | `POST /v1/responses` (OpenAI Responses API shape, stateful via `previous_response_id`). |
| `responses_streaming` | `true` | 3174 | `POST /v1/responses` with streaming enabled. |
| `run_submission` | `true` | 3175 | `POST /v1/runs` — async run, returns `run_id` with **202**. |
| `run_status` | `true` | 3176 | `GET /v1/runs/{run_id}`. |
| `run_events_sse` | `true` | 3177 | `GET /v1/runs/{run_id}/events` — SSE lifecycle stream. **This is the key one for a Raycast live view.** |
| `run_stop` | `true` | 3178 | `POST /v1/runs/{run_id}/stop`. |
| `run_steer` | `true` | 3179 | `POST /v1/runs/{run_id}/steer` — inject guidance mid-run. |
| `run_approval_response` | `true` | 3180 | `POST /v1/runs/{run_id}/approval` — answer a tool-approval prompt. |
| `tool_progress_events` | `true` | 3181 | The SSE stream emits per-tool progress events (not just start/end). Gates rendering a tool-activity feed. |
| `approval_events` | `true` | 3182 | The SSE stream emits approval-request events. Gates showing an approve/deny UI. Approval choices come from `_approval_event_choices` (`api_server.py:74-77`): `["once","session","always","deny"]`, or `["once","session","deny"]` when permanent is disallowed, or `["once","deny"]` when smart-denied. |
| `session_resources` | `true` | 3183 | The whole `/api/sessions*` CRUD family. |
| `model_options` | `true` | 3184 | `GET /api/model/options` (the rich provider/model inventory). **Gate your model picker on this.** |
| `session_chat` | `true` | 3185 | `POST /api/sessions/{id}/chat`. |
| `session_chat_streaming` | `true` | 3186 | `POST /api/sessions/{id}/chat/stream`. |
| `session_fork` | `true` | 3187 | `POST /api/sessions/{id}/fork`. |
| `session_model_lock` | `true` | 3188 | `POST /api/sessions/{id}/model` — the per-session model pin. **Gate your "change model for this chat" affordance on this.** |
| `admin_config_rw` | `false` | 3189 | There is **no** endpoint on this server to read or write `config.yaml`. Do not build a settings editor against the API server. |
| `jobs_admin` | `false` | 3190 | Advertised as unavailable — **but the 8 `/api/jobs*` routes ARE registered** (`api_server.py:2086-2093`). See §7.1. |
| `memory_write_api` | `false` | 3191 | No HTTP endpoint writes long-term memory. Memory is scoped via the `X-Hermes-Session-Key` header only. |
| `skills_api` | `true` | 3192 | `GET /v1/skills`. **Gate your skills list on this.** |
| `audio_api` | `false` | 3193 | No `/v1/audio/*` (TTS/STT) HTTP surface. |
| `realtime_voice` | `false` | 3194 | No realtime voice/websocket surface. |
| `session_continuity_header` | `"X-Hermes-Session-Id"` | 3195 | **String, not bool.** The header name to send on `/v1/chat/completions` and `/v1/responses` to continue an existing transcript. Read the name from here rather than hardcoding. |
| `session_key_header` | `"X-Hermes-Session-Key"` | 3196 | **String, not bool.** The header name that scopes long-term memory (e.g. Honcho) across transcripts. Independent of the session id. |
| `cors` | `bool(self._cors_origins)` | 3197 | **Config-dependent.** `false` on this machine. When `false`, any request carrying an `Origin` header is 403'd by the middleware (`api_server.py:1001-1003`). |

Two more values are config-dependent and worth calling out: `model` (top level) and `auth.required`.
Everything else in `features` is a source literal at 0.20.4.

#### `endpoints`

A flat map of `name → {method, path}`. `path` is an **aiohttp path template** with `{param}`
placeholders (e.g. `/v1/runs/{run_id}`). Interpolate, do not regex. Note this map covers **24**
endpoints while the route table registers **37** (38 when `_CRON_AVAILABLE`, which adds
`POST /api/cron/fire`) — the `endpoints` map deliberately omits
`/api/jobs*`, `/v1/responses/{id}` (GET/DELETE), `/api/platforms/{platform}/events`,
`/api/cron/fire`, and `/v1/health`.

### 1.4 Recommended extension gating logic

```
GET /health                      → server present? (no auth)
GET /v1/capabilities  (+Bearer)  → 401 ⇒ bad key; 200 ⇒ key valid + features
  features.session_resources     → show the chat/session UI at all
  features.session_chat_streaming→ stream vs. block-response
  features.model_options         → show the provider/model picker
  features.session_model_lock    → allow per-chat model override
  features.skills_api            → show the Skills list command
  features.run_events_sse        → show the live run/tool activity view
  endpoints.<name>.path          → build URLs (never hardcode)
  features.session_continuity_header / session_key_header → header names
```

**There is no `toolsets` feature flag.** `/v1/toolsets` is advertised only in `endpoints.toolsets`.
Gate a toolsets view on the presence of `endpoints.toolsets`, not on a `features` key.

---

## 2. `GET /v1/models`

**Handler:** `APIServerAdapter._handle_models`
**Location:** `gateway/platforms/api_server.py:3055-3101`
**Method:** `GET`
**Query params:** **none**
**Auth:** required.

### 2.1 What it actually returns

This is the **OpenAI-compatible model list**. It does **NOT** enumerate providers, and it does
**NOT** carry any capability metadata. It contains exactly:

1. One entry for the virtual gateway model (`self._model_name`, normally `"hermes-agent"`), plus
2. One entry per configured `model_routes` alias (`api_server.py:3088-3099`).

Source (`api_server.py:3066-3101`):

```python
now = int(time.time())
model_name = (
    self._resolve_model_name("")
    if _api_request_profile.get()
    else self._model_name
)
models = [
    {
        "id": model_name,
        "object": "model",
        "created": now,
        "owned_by": "hermes",
        "permission": [],
        "root": model_name,
        "parent": None,
    }
]
for alias, route_cfg in self._model_routes.items():
    if alias == model_name:
        continue  # already listed above
    models.append({
        "id": alias,
        "object": "model",
        "created": now,
        "owned_by": "hermes",
        "permission": [],
        "root": route_cfg.get("model", alias),
        "parent": model_name,
    })

return web.json_response({"object": "list", "data": models})
```

### 2.2 Literal example response — this machine

The live `config.yaml` has no `platforms.api_server.extra.model_routes`, so `_model_routes` is `{}`
(`_parse_model_routes`, `api_server.py:2273-2314`; the non-dict guard returns `{}` at `:2288-2293`).
Result is a single entry (`created` is `int(time.time())` at request time):

```json
{
  "object": "list",
  "data": [
    {
      "id": "hermes-agent",
      "object": "model",
      "created": 1755561600,
      "owned_by": "hermes",
      "permission": [],
      "root": "hermes-agent",
      "parent": null
    }
  ]
}
```

Confirmed by `tests/gateway/test_api_server.py:766-776` — `len(data["data"]) == 1`,
`data["data"][0]["id"] == "hermes-agent"`, `owned_by == "hermes"`.

### 2.3 Why `id` is `"hermes-agent"` here

`_resolve_model_name` (`api_server.py:1647-1670`) delegates to
`hermes_cli.model_switch.resolve_effective_model(explicit, profile_name, "hermes-agent")`
(`hermes_cli/model_switch.py:912-937`), which returns the first non-empty of
`(session_overrides, channel_config, global_config)`. With no `API_SERVER_MODEL_NAME` env var and no
named profile, both first tiers are `""` → the fallback `"hermes-agent"` wins.

Confirmed by `tests/gateway/test_api_server.py:791-794`.

### 2.4 With `model_routes` configured (illustrative)

If `platforms.api_server.extra.model_routes` were:

```yaml
model_routes:
  minimax-m2:
    model: "minimax/minimax-m1"
    provider: "openrouter"
  my-alias:
    model: "openai/gpt-5"
    api_key: "…"      # UPSTREAM provider key — NEVER echoed back
```

the response becomes (shape verified by `tests/gateway/test_api_server.py:2495-2506`):

```json
{
  "object": "list",
  "data": [
    {"id": "hermes-agent", "object": "model", "created": 1755561600, "owned_by": "hermes", "permission": [], "root": "hermes-agent", "parent": null},
    {"id": "minimax-m2",   "object": "model", "created": 1755561600, "owned_by": "hermes", "permission": [], "root": "minimax/minimax-m1", "parent": "hermes-agent"},
    {"id": "my-alias",     "object": "model", "created": 1755561600, "owned_by": "hermes", "permission": [], "root": "openai/gpt-5",       "parent": "hermes-agent"}
  ]
}
```

**Security guarantee (asserted by test at `tests/gateway/test_api_server.py:2506`):** the per-route
`api_key` never appears anywhere in this payload. Only `alias` and the resolved `model` string leak
out (`api_server.py:3085-3087` comment).

Only these four keys are ever accepted per route (`api_server.py:2295`):
`("model", "provider", "api_key", "base_url")`; a route with no `model` is dropped
(`api_server.py:2307-2312`).

---

## 3. `GET /api/model/options`

**Handler:** `APIServerAdapter._handle_model_options`
**Location:** `gateway/platforms/api_server.py:3103-3138`
**Method:** `GET`
**Auth:** required.

### 3.1 Query params

Exactly **one** is read (`api_server.py:3115`):

| Param | Type | Default | Effect |
|---|---|---|---|
| `refresh` | bool-ish string | `false` | Busts the per-provider model-id disk cache so every provider row re-fetches its live catalog, AND live-probes **every** saved custom endpoint. When `false`, only the *current* custom provider is probed. |

`refresh` is parsed by `_coerce_request_bool` (`api_server.py:222-244`). Accepted true strings
(`api_server.py:218`): `"1"`, `"true"`, `"yes"`, `"on"`. Accepted false strings
(`api_server.py:219`): `"0"`, `"false"`, `"no"`, `"off"`. Anything else → the default (`false`).

> The dashboard variant of this endpoint (`hermes_cli/web_server.py:6948-6954`) additionally accepts
> `profile`, `include_unconfigured`, and `explicit_only`. **The API-server variant does NOT** —
> those are hard-coded. Passing them to 8642 is silently ignored.

### 3.2 Handler body (verbatim, `api_server.py:3111-3138`)

```python
auth_err = self._check_auth(request)
if auth_err:
    return auth_err

refresh = _coerce_request_bool(request.query.get("refresh"), default=False)
try:
    from hermes_cli.inventory import build_model_options_payload, load_picker_context

    def _build_payload() -> Dict[str, Any]:
        return build_model_options_payload(
            load_picker_context(),
            include_unconfigured=True,
            refresh=refresh,
        )

    payload = await asyncio.to_thread(_build_payload)
    return web.json_response(payload)
except Exception:
    logger.exception("[%s] GET /api/model/options failed", self.name)
    return web.json_response(
        _openai_error(
            "Failed to list model options.",
            code="model_options_failed",
        ),
        status=500,
    )
```

Note `include_unconfigured=True` is fixed — the API server always returns the **full provider
universe**, including canonical providers with no credentials (as skeleton rows).

The 500 body (via `_openai_error`, `api_server.py:1091-1100`):

```json
{"error": {"message": "Failed to list model options.", "type": "invalid_request_error", "param": null, "code": "model_options_failed"}}
```

### 3.3 The payload shape

`build_model_options_payload` (`hermes_cli/inventory.py:284-315`) calls `build_models_payload`
(`hermes_cli/inventory.py:114-281`) with these flags fixed:

```python
build_models_payload(
    ctx,
    explicit_only=False,             # from the API server
    include_unconfigured=True,       # from the API server
    picker_hints=True,
    canonical_order=True,
    pricing=True,
    capabilities=True,
    featured=True,
    refresh=refresh,
    probe_custom_providers=refresh,
    probe_current_custom_provider=not refresh,
)
```

Top-level return (`hermes_cli/inventory.py:277-281`):

```python
return {
    "providers": rows,
    "model": ctx.current_model,
    "provider": ctx.current_provider,
}
```

- `model` / `provider` come from `load_picker_context()` (`hermes_cli/inventory.py:80-107`), which
  reads `config.model.default` (falling back to `config.model.name`) and `config.model.provider`.
- On this machine `config.yaml` starts with:
  ```yaml
  model:
    default: gpt-5.6-sol
    provider: openai-codex
    key_env: ''
    base_url: https://chatgpt.com/backend-api/codex
  ```
  so the response's `"model"` is `"gpt-5.6-sol"` and `"provider"` is `"openai-codex"`.

### 3.4 Per-provider row shape (every possible field)

Rows are produced by `hermes_cli.model_switch.list_authenticated_providers`
(`hermes_cli/model_switch.py:2570-…`) and then mutated by a chain of enrichers.

**Base fields — always present** (row literals at `model_switch.py:2913-2924`, `:3101-3109`,
`:3176-3184`, `:3446-3456`, `:3531-3541`, `:3841-3851`):

| Field | Type | Meaning |
|---|---|---|
| `slug` | `string` | The `--provider` / `model.provider` value. This is the id you send. |
| `name` | `string` | Display label (e.g. `"Nous Portal"`). |
| `is_current` | `bool` | True for the provider currently configured as the main model. |
| `is_user_defined` | `bool` | True for `providers:` / `custom_providers:` config entries. |
| `models` | `string[]` | Curated model ids for this provider. |
| `total_models` | `int` | Count of `models` (may differ from `len(models)` when `max_models` caps — the API server passes no cap). |
| `source` | `string` | One of `"built-in"` (2923), `"hermes"` (3108), `"canonical"` (3183), `"user-config"` (3452 / 3848), `"model-config"` (3538), `"virtual"` (moa, `inventory.py:877`), or `"configured-current"` (`inventory.py:586`). |

**Conditional fields:**

| Field | Type | Added by | Present when |
|---|---|---|---|
| `api_url` | `string` | `model_switch.py:3453`, `:3539`, `:3849` | User-defined / custom endpoints only. |
| `native_catalog_empty` | `bool` | `model_switch.py:3454`, `:3540`, `:3850` | Same rows; true when a live `/models` probe returned an empty native list. |
| `authenticated` | `bool` | `_apply_picker_hints`, `inventory.py:706-707` | Always (picker_hints=True). `false` for skeleton rows (`source == "canonical"` **and** empty `models`). |
| `auth_type` | `string` | `inventory.py:716` | Only on unconfigured skeleton rows (and `configured-current`, `inventory.py:568`). Values e.g. `"api_key"`, `"oauth"`, `"virtual"`. |
| `key_env` | `string` | `inventory.py:717` | Same rows. **This is an env-var NAME, e.g. `OPENAI_API_KEY` — never a value.** |
| `warning` | `string` | `inventory.py:718-722` (skeleton rows), `:880` (moa row) | Same rows. Human-readable setup hint. |
| `capabilities` | `object` | `_apply_capabilities`, `inventory.py:405-441` | Always (capabilities=True). See below. |
| `featured_models` | `string[]` | `_apply_featured`, `inventory.py:450-507` (assigned at `:494` / `:506`) | Always requested; **empty for single-lab providers** — callers fall back to top-N of `models`. |
| `pricing` | `object` | `_apply_pricing`, `inventory.py:746-852` | Only when the provider supports live pricing (openrouter / nous / novita) and models matched. |
| `free_tier` | `bool` | `inventory.py:840` | Nous rows only. |
| `unavailable_models` | `string[]` | `inventory.py:845`/`:847` | Nous rows only — paid models a free-tier account cannot pick. |
| `aliases` | `string[]` | `_apply_custom_aliases`, `inventory.py:521-527` | `is_user_defined` rows only. **Use membership in `aliases`, not string equality on `slug`, to decide if a custom provider row is "the current one" (`inventory.py:509-519`).** |

#### `capabilities` — READ THIS CAREFULLY

`_apply_capabilities` (`hermes_cli/inventory.py:405-441`; the `caps[model]` literal is at `:436-439`) attaches:

```python
caps[model] = {
    "fast": bool(model_supports_fast_mode(model)),
    "reasoning": reasoning,   # from models.dev; defaults True when uncatalogued
}
```

**`capabilities` contains ONLY `fast` and `reasoning`.** It does **NOT** contain
`context_window`, `supports_vision`, `supports_tools`, `max_output_tokens`, or `model_family`.
Those five live on a *different* endpoint on a *different* server — see §3.6.

#### `pricing` entry shape

`_apply_pricing` (`inventory.py:746-852`) produces per-model:

```python
{"input": "$3.00", "output": "$15.00", "cache": "$0.30" | None, "free": bool}
```

Plus, **for Nous rows only, and only when not free** (`inventory.py:809-826`):
`discount_percent` (number), `was_input` (string), `was_output` (string).

Prices are **pre-formatted display strings**, not numbers. `"free"` is a possible string value for
`input`/`output`.

### 3.5 Literal example response

Composed from the field definitions above. This is the *shape* to code against; the specific
providers/models depend on the user's credentials.

```json
{
  "providers": [
    {
      "slug": "openai-codex",
      "name": "OpenAI Codex",
      "is_current": true,
      "is_user_defined": false,
      "models": ["gpt-5.6-sol", "gpt-5.6-codex"],
      "total_models": 2,
      "source": "hermes",
      "authenticated": true,
      "capabilities": {
        "gpt-5.6-sol":   {"fast": true,  "reasoning": true},
        "gpt-5.6-codex": {"fast": true,  "reasoning": true}
      },
      "featured_models": []
    },
    {
      "slug": "nous",
      "name": "Nous Portal",
      "is_current": false,
      "is_user_defined": false,
      "models": ["x-ai/grok-4.5", "anthropic/claude-sonnet-5"],
      "total_models": 2,
      "source": "hermes",
      "authenticated": true,
      "capabilities": {
        "x-ai/grok-4.5":            {"fast": false, "reasoning": true},
        "anthropic/claude-sonnet-5": {"fast": true,  "reasoning": true}
      },
      "featured_models": ["x-ai/grok-4.5", "anthropic/claude-sonnet-5"],
      "pricing": {
        "x-ai/grok-4.5":             {"input": "$3.00", "output": "$15.00", "cache": "$0.30", "free": false},
        "anthropic/claude-sonnet-5": {"input": "$3.00", "output": "$15.00", "cache": null,    "free": false}
      },
      "free_tier": false,
      "unavailable_models": []
    },
    {
      "slug": "anthropic",
      "name": "Anthropic",
      "is_current": false,
      "is_user_defined": false,
      "models": [],
      "total_models": 0,
      "source": "canonical",
      "authenticated": false,
      "auth_type": "api_key",
      "key_env": "ANTHROPIC_API_KEY",
      "warning": "paste ANTHROPIC_API_KEY to activate",
      "capabilities": {},
      "featured_models": []
    }
  ],
  "model": "gpt-5.6-sol",
  "provider": "openai-codex"
}
```

The third row is the **unconfigured skeleton** shape (`inventory.py:594-603` + `_apply_picker_hints`
at `:705-722`) — `include_unconfigured=True` guarantees these appear.

The `moa` virtual row, when MoA presets exist (`_moa_provider_row`, `inventory.py:855-883`; the row literal is `:870-881`):

```json
{
  "slug": "moa",
  "name": "Mixture of Agents",
  "is_current": false,
  "is_user_defined": false,
  "models": ["preset-name-1"],
  "total_models": 1,
  "source": "virtual",
  "authenticated": true,
  "auth_type": "virtual",
  "warning": "Aggregator acts as the selected model; references provide analysis before each call."
}
```

### 3.6 `/api/model/options` vs `/v1/models` — the answer

| | `GET /v1/models` | `GET /api/model/options` |
|---|---|---|
| Handler | `api_server.py:3055` | `api_server.py:3103` |
| Purpose | OpenAI-compat shim | Hermes-native provider/model inventory |
| Envelope | `{"object":"list","data":[…]}` | `{"providers":[…],"model":…,"provider":…}` |
| Lists **providers**? | ❌ No | ✅ Yes — one row per provider |
| Per-model **capabilities**? | ❌ No | ✅ Partially — `{fast, reasoning}` **only** |
| context window / vision / tools? | ❌ No | ❌ **No** — see below |
| Pricing? | ❌ No | ✅ Yes (openrouter/nous/novita), pre-formatted strings |
| Auth hints (`key_env`, `warning`)? | ❌ No | ✅ Yes |
| Query params | none | `refresh` |
| Cost | Trivial (in-memory) | Expensive — network (pricing fetch, models.dev, `/models` probes); runs on `asyncio.to_thread` |
| Entry count here | 1 | Dozens of provider rows |

**Neither endpoint on the API server returns context window, vision, or tool-support.**

Those fields exist only on the **dashboard** server's `GET /api/model/info`
(`hermes_cli/web_server.py:6843-6913`), which returns:

```json
{
  "model": "gpt-5.6-sol",
  "provider": "openai-codex",
  "auto_context_length": 400000,
  "config_context_length": 0,
  "effective_context_length": 400000,
  "capabilities": {
    "supports_tools": true,
    "supports_vision": true,
    "supports_reasoning": true,
    "context_window": 400000,
    "max_output_tokens": 128000,
    "model_family": "gpt-5"
  }
}
```

(field names verified at `web_server.py:6896-6903` and `:6907-6913`; the numeric values above are
illustrative placeholders — **UNVERIFIED** for this machine since the dashboard was not probed.)

> **⚠️ `/api/model/info` is NOT on the API server.** It is not in `_http_route_table()`
> (`api_server.py:2053-2107`). It lives on the separate Hermes dashboard/web server with its own
> port and its own dashboard-token auth. A Raycast extension talking only to `:8642` **cannot**
> obtain context window / vision / tool-support. If the extension needs those, it must either
> (a) also talk to the dashboard server, or (b) derive them client-side from a models.dev mirror.
> **UNVERIFIED:** the dashboard server's port and auth scheme on this machine (not probed).

---

## 4. `GET /v1/skills`

**Handler:** `APIServerAdapter._handle_skills`
**Location:** `gateway/platforms/api_server.py:3226-3255`
**Method:** `GET`
**Auth:** required.
**Query params:** **NONE.** The handler never touches `request.query`.
**Pagination:** **NONE.** No `limit`, `offset`, `cursor`, or `has_more`. The full list always comes back.
**Filtering:** **NONE** at the HTTP layer. No `category` filter (unlike the in-agent `skills_list()`
tool at `tools/skills_tool.py:804`, which does take a `category` argument — that is *not* exposed
over HTTP). Filter client-side on `category`.

### 4.1 Handler body (verbatim, `api_server.py:3238-3255`)

```python
auth_err = self._check_auth(request)
if auth_err:
    return auth_err

try:
    from tools.skills_tool import _find_all_skills, _sort_skills
    skills = _sort_skills(_find_all_skills(skip_disabled=False))
except Exception:
    logger.exception("GET /v1/skills failed")
    return web.json_response(
        _openai_error("Failed to enumerate skills", err_type="server_error"),
        status=500,
    )

return web.json_response({
    "object": "list",
    "data": skills,
})
```

### 4.2 Skill entry fields — the actual answer

`_find_all_skills` (`tools/skills_tool.py:673-798`) appends exactly this dict per skill
(`tools/skills_tool.py:776-780`):

```python
skills.append({
    "name": name,
    "description": description,
    "category": category,
})
```

**Each skill has exactly three fields: `name`, `description`, `category`.**

There is **NO `enabled` field** and **NO `source` field** in the `/v1/skills` response.

> The task brief asked about `enabled` and `source`. Confirmed absent. The dashboard's own skills
> listing *does* annotate `s["enabled"]` / `s["usage"]` after the fact — noted in the cache
> comment at `tools/skills_tool.py:722-724` (`"e.g. web_server annotates s['enabled']/s['usage']"`)
> — but the API server does no such annotation. **If the extension needs enabled/disabled state, it
> is not available from `/v1/skills`.**

Field semantics:

| Field | Type | Derivation |
|---|---|---|
| `name` | `string` | `frontmatter["name"]`, falling back to the skill directory name; truncated to `MAX_NAME_LENGTH` = 64 (`skills_tool.py:756`, constant at `:163`). Unique — first-wins dedup across scan dirs (`:757-758`). |
| `description` | `string` | `frontmatter["description"]`; if empty, the first non-heading line of the body (`skills_tool.py:762-768`). Truncated to `MAX_DESCRIPTION_LENGTH` = 1024 with a `"..."` suffix (`:770-771`, constant at `:164`). |
| `category` | `string` | `_get_category_from_path(skill_md)` (`skills_tool.py:773`, function at `:566`) — derived from the directory the SKILL.md sits in. May be `""`. |

### 4.3 Disabled-skill semantics (the `skip_disabled` trap)

The parameter name is **inverted relative to intuition**. `tools/skills_tool.py:673-687`:

```python
def _find_all_skills(*, skip_disabled: bool = False) -> List[Dict[str, Any]]:
    """...
    skip_disabled: If True, return ALL skills regardless of disabled
        state (used by ``hermes skills`` config UI). Default False
        filters out disabled skills.
    """
```

and `:699`: `disabled = set() if skip_disabled else _get_disabled_skill_names()`.

The API server passes `skip_disabled=False` (`api_server.py:3244`), so **`disabled` IS populated and
disabled skills ARE filtered out**. This matches the handler docstring at `api_server.py:3235-3236`
("Disabled skills are excluded so the listing matches what the agent actually loads").

**Net: `/v1/skills` returns only enabled skills.** That is why an `enabled` field would be redundant —
every row is implicitly `enabled: true`.

Additional filters applied during the scan:
- Skills whose frontmatter fails `skill_matches_platform()` are skipped (`skills_tool.py:750-751`).
- Skills whose frontmatter fails `skill_matches_environment()` are skipped (`:753-754`).
- Paths containing any `_EXCLUDED_SKILL_DIRS` component are skipped (`:741-742`).

### 4.4 Ordering

`_sort_skills` (`tools/skills_tool.py:799-801`):

```python
return sorted(skills, key=lambda s: (s.get("category") or "", s["name"]))
```

**Sorted by `(category, name)` ascending.** Deterministic — the extension can rely on it.

### 4.5 Scan roots

`_find_all_skills` scans, in first-wins precedence order (`tools/skills_tool.py:705-710`):
1. `get_project_skills_dirs()` — trusted project-local dirs (routed through a quarantine gate)
2. `_skills_dir()` — the **live profile** Hermes home skills dir
3. `get_external_skills_dirs()`

Results are cached per-session with a signature over dir mtimes + the disabled set, plus a TTL
(`skills_tool.py:713-725`, `:789-791`). So a newly added skill may take up to `_SKILLS_CACHE_TTL_SECONDS`
to appear. That constant is **30.0 seconds** (`tools/skills_tool.py:102`).

### 4.6 Literal example response

Built from the fixture in `tests/gateway/test_api_server.py:889-892` plus the sorting rule
(`category` ascending: `"creative"` < `"github"`):

```json
{
  "object": "list",
  "data": [
    {
      "name": "ascii-art",
      "description": "ASCII art generation",
      "category": "creative"
    },
    {
      "name": "github",
      "description": "GitHub workflow skill",
      "category": "github"
    }
  ]
}
```

The test asserts `data["object"] == "list"` and, for every entry,
`set(entry.keys()) >= {"name","description","category"}`
(`tests/gateway/test_api_server.py:901-906`).

### 4.7 Error response

```json
{"error": {"message": "Failed to enumerate skills", "type": "server_error", "param": null, "code": null}}
```
HTTP **500**. (`api_server.py:3246-3250` + `_openai_error` at `:1091-1100`.)

---

## 5. `GET /v1/toolsets`

**Handler:** `APIServerAdapter._handle_toolsets`
**Location:** `gateway/platforms/api_server.py:3257-3312`
**Method:** `GET`
**Auth:** required.
**Query params:** **NONE.**
**Pagination / filtering:** **NONE.**

### 5.1 Handler body (verbatim, `api_server.py:3266-3312`)

```python
auth_err = self._check_auth(request)
if auth_err:
    return auth_err

try:
    from hermes_cli.config import load_config
    from hermes_cli.tools_config import (
        _get_effective_configurable_toolsets,
        _get_platform_tools,
        _toolset_has_keys,
        get_nous_subscription_features,
    )
    from toolsets import resolve_toolset

    config = load_config()
    enabled_toolsets = _get_platform_tools(
        config,
        "api_server",
        include_default_mcp_servers=False,
    )
    features = get_nous_subscription_features(config)
    data: List[Dict[str, Any]] = []
    for name, label, desc in _get_effective_configurable_toolsets():
        try:
            tools = sorted(set(resolve_toolset(name)))
        except Exception:
            tools = []
        is_enabled = name in enabled_toolsets
        data.append({
            "name": name,
            "label": label,
            "description": desc,
            "enabled": is_enabled,
            "configured": _toolset_has_keys(name, config, features=features),
            "tools": tools,
        })
except Exception:
    logger.exception("GET /v1/toolsets failed")
    return web.json_response(
        _openai_error("Failed to enumerate toolsets", err_type="server_error"),
        status=500,
    )

return web.json_response({
    "object": "list",
    "platform": "api_server",
    "data": data,
})
```

### 5.2 Entry fields — the actual answer

Each entry has **six** fields (not four):

| Field | Type | Source | Meaning |
|---|---|---|---|
| `name` | `string` | tuple[0] from `_get_effective_configurable_toolsets()` | The toolset key, e.g. `"web"`, `"browser"`, `"terminal"`. This is the id. |
| `label` | `string` | tuple[1] | Display label **with a leading emoji**, e.g. `"🔍 Web Search & Scraping"` (`hermes_cli/tools_config.py:97`). Strip it with `gui_toolset_label()` logic (`tools_config.py:127-137`) if you want plain text. |
| `description` | `string` | tuple[2] | Short tool list, e.g. `"web_search, web_extract"`. |
| `enabled` | `bool` | `name in enabled_toolsets` | See §5.3. |
| `configured` | `bool` | `_toolset_has_keys(name, config, features=features)` | See §5.3. |
| `tools` | `string[]` | `sorted(set(resolve_toolset(name)))` | Concrete tool names this toolset expands to. **Sorted and deduped.** `[]` if resolution throws. |

The `platform` field on the envelope is the literal `"api_server"` (`api_server.py:3311`) — it tells
you which platform's enable/disable state the `enabled` flags reflect.

### 5.3 `enabled` vs `configured` vs "available" — how to tell them apart

This is the single most confusing part of the endpoint. Precise semantics:

**`enabled`** — "is this toolset switched on **for the `api_server` platform**?"

Computed as `name in _get_platform_tools(config, "api_server", include_default_mcp_servers=False)`
(`_get_platform_tools` call at `api_server.py:3281-3285`; the `is_enabled` test at `:3293`).

`_get_platform_tools` (`hermes_cli/tools_config.py:2403-2500+`) resolves:
1. `config["platform_toolsets"]["api_server"]` if it is a list → explicit user config.
2. Otherwise falls back to `PLATFORMS["api_server"]["default_toolset"]`, which is
   `"hermes-api-server"` (`hermes_cli/platforms.py:42`).
3. When the saved list contains configurable keys directly, direct membership wins
   (`tools_config.py:2446-2452`). When the list contains **only** a composite (like `hermes-api-server`
   — the api_server default, and the case on this machine), `has_explicit_config` is `False` and the
   `else` branch runs: the composite is expanded to tool names and reverse-mapped, a configurable
   toolset counting as enabled iff its **static** tool set is a subset of the composite's tools
   (`tools_config.py:2494-2512`), minus `_DEFAULT_OFF_TOOLSETS` (`tools_config.py:2531-2556`).
   (The parallel mixed-config path — an explicit list that also contains a composite — is
   `tools_config.py:2461-2492`.)

`_DEFAULT_OFF_TOOLSETS` (`tools_config.py:156`):
`{"homeassistant", "spotify", "discord", "discord_admin", "video", "video_gen", "x_search", "a2a"}`.

**On THIS machine:** `config.yaml` has `platform_toolsets.cli` (a long explicit list) but **no
`platform_toolsets.api_server` key** (verified — the `platform_toolsets:` block at line 532 contains
only `cli:`). So the api_server platform falls through to the `hermes-api-server` composite
(`toolsets.py:461+`) and `enabled` is computed by subset inference, not by an explicit user list.

**`configured`** — "does this toolset have the credentials/providers it needs?"

Computed by `_toolset_has_keys` (`hermes_cli/tools_config.py:2809-2859`):
- `vision`: true iff `resolve_vision_provider_client()` returns a client (`:2820-2827`).
- `web`, `image_gen`, `video_gen`, `tts`, `stt`, `browser`: true if the Nous subscription snapshot
  says the feature is `available` **or** `managed_by_nous` (`:2829-2837`).
- Otherwise, if the toolset is in `TOOL_CATEGORIES`: true iff **any** visible provider has all its
  `env_vars` set — **or has no `env_vars` at all** (a no-key provider like Edge TTS or Local Browser
  counts as configured, `:2839-2851`).
- Otherwise: true iff every var in `TOOLSET_ENV_REQUIREMENTS[name]` is set; **an empty requirements
  list means `configured: true`** (`:2853-2857`).

Consequence: **`configured: true` does not imply the toolset needs no setup** — many toolsets have
no requirements and are trivially "configured".

**"available"** — there is **no `available` field**. Derive it:

| `enabled` | `configured` | Interpretation for the UI |
|---|---|---|
| `true` | `true` | ✅ **Available.** The agent has these tools and they will work. |
| `true` | `false` | ⚠️ Switched on but **missing credentials** — tool calls will fail or the schema may be withheld by the tool's runtime `check_fn`. Show a "needs setup" badge. |
| `false` | `true` | 💤 Credentials present but the toolset is **off for `api_server`**. Show as "available to enable". |
| `false` | `false` | ⛔ Off and unconfigured. |

**There is no HTTP endpoint on the API server to flip `enabled` or set credentials.**
`features.admin_config_rw` is `false` (`api_server.py:3189`). Toolset changes must be made via
`hermes tools` (CLI) or the dashboard. The extension should render this read-only.

### 5.4 The toolset universe

`_get_effective_configurable_toolsets()` (`hermes_cli/tools_config.py:245-268`) =
`CONFIGURABLE_TOOLSETS` (`tools_config.py:96-124`) + any plugin-provided toolsets appended at the
end (deduped by key, built-in label wins).

The built-in 27, verbatim from `hermes_cli/tools_config.py:96-124` — `(name, label, description)`:

```python
CONFIGURABLE_TOOLSETS = [
    ("web",             "🔍 Web Search & Scraping",    "web_search, web_extract"),
    ("browser",         "🌐 Browser Automation",       "navigate, click, type, scroll"),
    ("terminal",        "💻 Terminal & Processes",      "terminal, process"),
    ("file",            "📁 File Operations",           "read, write, patch, search"),
    ("code_execution",  "⚡ Code Execution",            "execute_code"),
    ("vision",          "👁️  Vision / Image Analysis",  "vision_analyze"),
    ("video",           "🎬 Video Analysis",            "video_analyze (requires video-capable model)"),
    ("image_gen",       "🎨 Image Generation",          "image_generate"),
    ("video_gen",       "🎬 Video Generation",          "video_generate (text/image/reference)"),
    ("bfl",             "🎬 BFL FLUX 3 Video",          "bfl_flux3_*"),
    ("x_search",        "🐦 X (Twitter) Search",        "x_search (requires xAI OAuth or XAI_API_KEY)"),
    ("tts",             "🔊 Text-to-Speech",            "text_to_speech"),
    ("stt",             "🎙️ Speech-to-Text",           "voice transcription (gateway voice messages + voice mode)"),
    ("skills",          "📚 Skills",                    "list, view, manage"),
    ("todo",            "📋 Task Planning",             "todo"),
    ("memory",          "💾 Memory",                    "persistent memory across sessions"),
    ("context_engine",  "🧩 Context Engine",            "runtime tools from the active context engine"),
    ("session_search",  "🔎 Session Search",            "search past conversations"),
    ("clarify",         "❓ Clarifying Questions",      "clarify"),
    ("delegation",      "👥 Task Delegation",           "delegate_task"),
    ("cronjob",         "⏰ Cron Jobs",                 "create/list/update/pause/resume/run, with optional attached skills"),
    ("homeassistant",    "🏠 Home Assistant",           "smart home device control"),
    ("spotify",          "🎵 Spotify",                  "playback, search, playlists, library"),
    ("discord",         "💬 Discord (read/participate)", "fetch messages, search members, create thread"),
    ("discord_admin",   "🛡️  Discord Server Admin",    "list channels/roles, pin, assign roles"),
    ("yuanbao",          "🤖 Yuanbao",                  "group info, member queries, DM"),
    ("computer_use",     "🖱️  Computer Use (macOS/Windows/Linux)", "background desktop control via cua-driver"),
]
```

`_CONFIG_ONLY_TOOLSETS = {"stt"}` (`tools_config.py:165`) — `stt` ships zero tool schemas; its
on/off lives in `stt.enabled`, not `platform_toolsets`. It still appears in this listing (the
handler iterates the full `_get_effective_configurable_toolsets()` with no exclusion), so expect
`stt` with an empty or odd `tools` array. **UNVERIFIED:** the exact `tools` value for `stt`.

### 5.5 Literal example response

Shape verified against `tests/gateway/test_api_server.py:909-953` (which asserts
`data["object"] == "list"`, `data["platform"] == "api_server"`, `enabled` booleans, sorted `tools`,
and `configured`):

```json
{
  "object": "list",
  "platform": "api_server",
  "data": [
    {
      "name": "web",
      "label": "🔍 Web Search & Scraping",
      "description": "web_search, web_extract",
      "enabled": true,
      "configured": true,
      "tools": ["web_extract", "web_search"]
    },
    {
      "name": "browser",
      "label": "🌐 Browser Automation",
      "description": "navigate, click, type, scroll",
      "enabled": true,
      "configured": true,
      "tools": ["browser_back", "browser_click", "browser_navigate", "browser_scroll", "browser_snapshot", "browser_type"]
    },
    {
      "name": "terminal",
      "label": "💻 Terminal & Processes",
      "description": "terminal, process",
      "enabled": true,
      "configured": true,
      "tools": ["process", "terminal"]
    },
    {
      "name": "spotify",
      "label": "🎵 Spotify",
      "description": "playback, search, playlists, library",
      "enabled": false,
      "configured": false,
      "tools": ["spotify_control", "spotify_search"]
    }
  ]
}
```

> `tools` arrays above for `browser` / `spotify` are illustrative of the *shape*; the exact members
> come from `resolve_toolset(name)` at runtime and are **UNVERIFIED** without an authenticated probe.
> The `web` and `terminal` arrays match the descriptions in `CONFIGURABLE_TOOLSETS`.

The test's minimal verified example (`test_api_server.py:938-948`):

```json
{
  "object": "list",
  "platform": "api_server",
  "data": [
    {"name": "default", "label": "Default Tools", "description": "Core tools",
     "enabled": true,  "configured": true, "tools": ["read_file", "terminal"]},
    {"name": "web",     "label": "Web Tools",     "description": "Search and extract",
     "enabled": false, "configured": true, "tools": ["web_search"]}
  ]
}
```

### 5.6 Error response

```json
{"error": {"message": "Failed to enumerate toolsets", "type": "server_error", "param": null, "code": null}}
```
HTTP **500**. (`api_server.py:3304-3307`.)

### 5.7 Performance warning

`resolve_toolset` is called once per toolset (27+ calls) and is **not** offloaded to a thread — it
runs directly on the aiohttp event loop (`api_server.py:3290`). `load_config()`,
`_get_platform_tools()`, `get_nous_subscription_features()`, and `_toolset_has_keys()` (which can hit
`resolve_vision_provider_client()` and Nous subscription state) are likewise on-loop. `resolve_toolset`
is memoized per registry generation (`toolsets.py:788-796`, `:869-880`), which limits the damage, but
**treat `/v1/toolsets` as a potentially slow call and cache the result in the extension.**

---

## 6. Changing the model

There are **four distinct mechanisms**, at three different scopes. Only two of them live on the API
server.

### 6.1 Scope map

| Scope | Mechanism | Server | Persistence |
|---|---|---|---|
| Global default (all new sessions) | `POST /api/model/set` | **Dashboard web server — NOT :8642** | Writes `~/.hermes/config.yaml` |
| Per session, durable | `POST /api/sessions/{id}/model` | API server `:8642` | Writes `sessions.model_config.browser_model_lock` in state.db |
| Per session, at creation | `POST /api/sessions` with `model`/`provider` | API server `:8642` | Writes `sessions.model` + optionally the lock |
| Per single turn | `model` / `provider` / `model_options` in the chat body | API server `:8642` | Not persisted |

### 6.2 `POST /api/sessions/{session_id}/model` — the session model lock

**Handler:** `APIServerAdapter._handle_session_model_lock`
**Location:** `gateway/platforms/api_server.py:4122-4162`
**Method:** `POST` (**there is no PATCH on this path** — see the route table, `api_server.py:2077`)
**Gated by:** `features.session_model_lock` in `/v1/capabilities`.

Flow (`api_server.py:4124-4143`):
1. `_check_auth`
2. `_get_existing_session_or_404(session_id)` → **404** if the session row does not exist
3. `_read_json_body` → **400** on non-JSON or non-object body
4. `_session_runtime_request_from_body(body)` then **forces** `runtime_request["require_model_lock"] = True`
   (`api_server.py:4135`) — the lock is unconditional on this route, regardless of what the body says
5. `_runtime_lock_error(...)` → **400** or **409** (see below)
6. `_persist_session_runtime_lock(...)` → **500** on DB failure

**Request body** (parsed by `_session_runtime_request_from_body`, `api_server.py:2380-2417`):

| Field | Aliases accepted | Type | Notes |
|---|---|---|---|
| `model` | `model_id` | `string` | Max 200 chars; rejected if it contains `\r`, `\n`, or `\0` (`_clean_runtime_id`, `api_server.py:2339-2347`). Supports a `provider::model` prefix form (`_split_provider_prefixed_model`, `api_server.py:2348-2355`) where the provider part must match `^[a-zA-Z0-9_.-]{2,64}$`. **A value equal to the virtual model (`hermes-agent`) is nulled out** (`api_server.py:2388-2398`). |
| `provider` | `provider_id` | `string` | Max 80 chars, same control-char rules. |
| `model_options` | — | `object` | See §6.5. |
| `require_model_lock` | — | bool-ish | Read (`api_server.py:2414`) but **overridden to `True`** on this route (`:4135`). Only meaningful on `/chat` and `POST /api/sessions`. |

**Literal request:**

```json
{
  "provider": "nous",
  "model": "x-ai/grok-4.5",
  "require_model_lock": true
}
```

(exact body used by `tests/gateway/test_session_api.py:578-584`)

With options:

```json
{
  "provider": "openai-codex",
  "model": "gpt-5.6-sol",
  "require_model_lock": true,
  "model_options": {
    "reasoning": {"enabled": true, "effort": "high"},
    "service_tier": "priority"
  }
}
```

**Literal success response** (`api_server.py:4159-4162`, HTTP **200**):

```json
{
  "object": "hermes.session.model_lock",
  "session_id": "endpoint-lock-chat",
  "runtime": {
    "provider": "nous",
    "model": "x-ai/grok-4.5",
    "route_source": "raw_request",
    "requested": {
      "provider": "nous",
      "model": "x-ai/grok-4.5"
    },
    "model_lock": "accepted"
  }
}
```

The `runtime` sub-object is built by `_sanitize_runtime_metadata` (`api_server.py:2538-2565`) with
`model_lock="accepted"` hard-coded at `api_server.py:4157`. `route_source` is
`runtime_request["route_source"] or "raw_request"` (`api_server.py:4153` and `:4156`); it is `"model_routes"`
when the `model` matched a configured alias, else `"raw_request"`.

**Error responses:**

| Condition | Status | Body |
|---|---|---|
| Bad/missing bearer | 401 | `{"error":{"message":"Invalid gateway API key (API_SERVER_KEY)","type":"gateway_auth_error","code":"gateway_auth_failed"}}` |
| Unknown session | 404 | `{"error":{"message":"Session not found: <id>","type":"invalid_request_error","param":null,"code":"session_not_found"}}` (`api_server.py:3379`) |
| Body not a JSON object | 400 | `{"error":{"message":"Request body must be a JSON object","type":"invalid_request_error","param":null,"code":null}}` (`api_server.py:3366`) |
| Neither `model` nor `provider` given | 400 | `{"error":{"message":"require_model_lock was set but no model/provider was provided","type":"invalid_request_error","param":null,"code":"missing_model"}}` (`_runtime_lock_error`, `api_server.py:2419-2436`; this branch at `:2426-2430`) |
| Cannot be routed (would silently fall back to global) | 409 | `{"error":{"message":"Requested Browser model lock cannot be routed; refusing silent global fallback","type":"invalid_request_error","param":null,"code":"model_lock_unavailable"}}` (`api_server.py:2431-2435`) |
| DB write failed | 500 | `{"error":{"message":"Could not persist the requested session model lock","type":"invalid_request_error","param":null,"code":"model_lock_persistence_failed"}}` (`api_server.py:4139-4146`) |

Test `tests/gateway/test_session_api.py:819-838` confirms the 400/409 split and that
`_run_agent` is never called when the lock cannot be honored.

**What gets persisted:** `_persist_session_runtime_lock` (`api_server.py:2438-2477`) calls
`db.update_session_runtime_lock(session_id, model=…, provider=…, model_options=…, route_source=…, confirmed=True)`.
The row's `model_config` JSON then contains:

```json
{
  "browser_model_lock": {
    "provider": "nous",
    "model": "x-ai/grok-4.5",
    "model_options": {},
    "route_source": "raw_request",
    "confirmed": true,
    "updated_at": 1755561600.0
  }
}
```

(literal shape from `api_server.py:3477-3486`, asserted at `tests/gateway/test_session_api.py:527-529`)

**How the lock is consumed on later turns:** `_effective_session_runtime_request`
(`api_server.py:2524-2535`) prefers a body-supplied model/provider; when the body has neither, it
falls back to `_runtime_request_from_persisted_session_lock` (`api_server.py:2479-2522`), which
requires `lock["confirmed"]` to be truthy and returns `route_source: "session_model_lock"`.
Verified end-to-end by `tests/gateway/test_session_api.py:588-605`: after the lock POST, a plain
`{"message": "use the stored lock"}` chat resolves to provider `nous`, model `x-ai/grok-4.5`, and the
chat response carries `runtime.route_source == "session_model_lock"`.

### 6.3 `POST /api/sessions` — set the model at creation

**Handler:** `_handle_create_session`, `api_server.py:3427-3546`

Accepted body fields (`api_server.py:3446-3489`):

| Field | Alias | Type | Notes |
|---|---|---|---|
| `id` | `session_id` | `string` | Optional. Auto-generated as `api_{epoch}_{8-hex}` if absent (`:3447`). Rejected if it contains `\r\n\0`, is path-unsafe, or exceeds 256 chars (`:3449-3453`). |
| `system_prompt` | — | `string`\|null | 400 `invalid_system_prompt` if not a string. |
| `source` | — | `string` | Normalized by `_normalize_session_source` (`api_server.py:2568-2573`). Allowed: `api_server`, `hermes_browser`, `browser`(→`hermes_browser`), `cli`, `telegram`, `discord`, `slack`, `desktop`, `dashboard`. Anything else silently becomes `api_server`. |
| `model` / `provider` / `model_options` / `require_model_lock` | — | — | Same parsing as §6.2 (`api_server.py:3460`). |
| `title` | — | `string`\|null | Sanitized; a duplicate title rolls back the insert and 400s `invalid_title`. |

**Literal request** (verbatim from `tests/gateway/test_session_api.py:503-513`):

```json
{
  "id": "browser-lock-session",
  "source": "hermes_browser",
  "provider": "nous",
  "model": "x-ai/grok-4.5",
  "require_model_lock": true,
  "title": "Browser lock",
  "system_prompt": "browser prompt"
}
```

**Literal response** (HTTP **201**, `api_server.py:3546`; `_session_response` at `api_server.py:3329-3349`):

```json
{
  "object": "hermes.session",
  "session": {
    "id": "browser-lock-session",
    "source": "hermes_browser",
    "model": "x-ai/grok-4.5",
    "title": "Browser lock",
    "started_at": 1755561600.0,
    "message_count": 0,
    "pinned": false,
    "archived": false,
    "hidden": false,
    "has_system_prompt": true,
    "has_model_config": true
  }
}
```

`_session_response` whitelists these keys (`api_server.py:3332-3339`) — a key absent from the DB row
is simply absent from the JSON:

```
id, source, user_id, model, title, started_at, ended_at, end_reason,
message_count, tool_call_count, input_tokens, output_tokens,
cache_read_tokens, cache_write_tokens, reasoning_tokens,
estimated_cost_usd, actual_cost_usd, api_call_count, parent_session_id,
last_active, preview, _lineage_root_id, pinned, archived, hidden
```

plus the two always-added derived booleans `has_system_prompt` and `has_model_config`
(`api_server.py:3347-3348`). **`system_prompt` and `model_config` themselves are never exposed.**

Errors: **409** `session_exists` (`api_server.py:3544`), **400** `invalid_session_id` /
`invalid_title` / `invalid_system_prompt`, **503** `session_db_unavailable` (`api_server.py:3445`).

### 6.4 `PATCH /api/sessions/{session_id}` — **CANNOT change the model**

**Handler:** `_handle_patch_session`, `api_server.py:3558-3602`

The allowed field set is a hard whitelist (`api_server.py:3575`):

```python
allowed = {"title", "end_reason", "pinned", "archived", "hidden", "unread"}
```

Anything else → **400**:

```json
{"error": {"message": "Unsupported session fields: model, provider", "type": "invalid_request_error", "param": null, "code": "unsupported_session_field"}}
```

(`api_server.py:3576-3578`)

**Do not attempt to PATCH `model`.** Use `POST /api/sessions/{id}/model`.

The four flags (`pinned`, `archived`, `hidden`, `unread`) must be real JSON booleans or you get
**400** `invalid_session_field` (`api_server.py:3580-3582`).

### 6.5 Per-turn override on `POST /api/sessions/{id}/chat[/stream]`

`_handle_session_chat` (`api_server.py:3725-…`) reads model/provider from the same body
(`api_server.py:3752-3755` → `_effective_session_runtime_request`). Precedence
(`api_server.py:2530-2535` and the comment block at `:3743-3751`):

1. **Confirmed session lock** (body `require_model_lock: true`, or a previously persisted
   `browser_model_lock.confirmed`) — wins over everything.
2. **Session-persisted `sessions.model`** — routed through `model_routes` if it's an alias
   (`api_server.py:3781`), else threaded as a raw `session_model` (`:3783`).
3. **Per-request body `model`/`provider`** via `_request_agent_overrides` (`api_server.py:372-410`).

`_request_agent_overrides` maps body → agent kwargs:

```python
overrides["requested_provider"] = body["provider"]      # if non-empty
overrides["requested_model"]    = body["model"]         # if non-empty, != virtual_model,
                                                        #   and (provider given or allow_bare_model)
overrides["model_options"]      = dict(body["model_options"])   # if a dict
```

For **session chat** and **`/v1/runs`**, `allow_bare_model` is always `True` (Hermes-native
surfaces). For **`/v1/chat/completions`** and **`/v1/responses`**, a bare `model` with no `provider`
is honored **only if** `platforms.api_server.extra.direct_model_requests: true`
(`api_server.py:1416-1420`, default **`False`**). Comment at `api_server.py:385-393`.

> **Critical for a Raycast extension using `/v1/chat/completions`:** with the default config, sending
> `{"model": "gpt-5.6-sol"}` and no `provider` is **silently ignored** and the gateway default runs.
> Either send an explicit `provider` alongside, or use the Hermes-native `/api/sessions/{id}/chat`,
> or have the user enable `direct_model_requests`.

**`model_options` shape** — normalized by `_runtime_options_from_model_options`
(`api_server.py:2361-2378`):

```json
{
  "reasoning": {"enabled": true, "effort": "high"},
  "service_tier": "priority",
  "fast": true
}
```

- `reasoning.enabled === false` → `runtime_options["reasoning_config"] = {"enabled": false}`
- else `reasoning.effort` (≤32 chars) → `{"enabled": true, "effort": "<effort>"}`
- else `reasoning.enabled === true` → `{"enabled": true}`
- `service_tier` (≤32 chars) wins; otherwise a truthy `fast` sets `service_tier: "priority"`
  (`api_server.py:2374-2377`)

Valid reasoning efforts (`_REASONING_EFFORTS`, `api_server.py:248`):
`{"none", "minimal", "low", "medium", "high", "xhigh"}`.
**UNVERIFIED:** whether an out-of-set effort is rejected or passed through by this particular path —
`_RUNTIME_...` validation for the session-chat route was not traced.

Per-model support for these two dials is exactly what
`/api/model/options` → `providers[].capabilities[model] = {fast, reasoning}` tells you
(`hermes_cli/inventory.py:405-441`, docstring at `:152-156`: *"so pickers can gate the
model-options controls (fast toggle / reasoning) to what each model actually supports"*).

### 6.6 The GLOBAL default model setter — `POST /api/model/set` (NOT on the API server)

**Handler:** `set_model_assignment`, `hermes_cli/web_server.py:7211-7272` (async wrapper; the response
literals and validation quoted below live in its synchronous body `_set_model_assignment_sync`, `web_server.py:7274+`)
**This route is NOT in `_http_route_table()`.** It lives on the Hermes **dashboard** FastAPI server.
**UNVERIFIED:** the dashboard's port and auth on this machine (not probed).

Writes `~/.hermes/config.yaml` (here: `C:\Users\<usuario>\AppData\Local\hermes\config.yaml`) and applies
to **new sessions only** — the running chat is unaffected (docstring `web_server.py:7214-7218`).

**Request body** — Pydantic `ModelAssignment` (`hermes_cli/web_models.py:122-148`):

```python
class ModelAssignment(BaseModel):
    scope: str                            # "main" | "auxiliary"  (required)
    provider: str                         # (required)
    model: str                            # (required)
    task: str = ""                        # auxiliary slot name; "" = all slots; "__reset__" = reset all
    base_url: str = ""                    # optional custom/local endpoint
    api_key: str = ""                     # optional key for that endpoint
    confirm_expensive_model: bool = False
    profile: Optional[str] = None
```

Also accepts a `profile` **query** param (`web_server.py:7212`); `body.profile` takes precedence
(`web_server.py:7258`).

Auxiliary slots (`web_server.py:6934-6946`): `vision`, `web_extract`, `compression`, `skills_hub`,
`approval`, `mcp`, `title_generation`, `triage_specifier`, `kanban_decomposer`, `profile_describer`,
`curator`.

**Literal request — set the global default:**

```json
{
  "scope": "main",
  "provider": "nous",
  "model": "x-ai/grok-4.5"
}
```

**Literal success response** (`web_server.py:7393-7402`):

```json
{
  "ok": true,
  "scope": "main",
  "provider": "nous",
  "model": "x-ai/grok-4.5",
  "base_url": "",
  "gateway_tools": [],
  "stale_aux": [],
  "cron_model_impact": null
}
```

(`cron_model_impact`'s exact type is **UNVERIFIED** — the variable's construction was not traced.)

**Expensive-model confirmation gate** (`web_server.py:7235-7255`): if `confirm_expensive_model` is
`false` and `combined_selection_warning()` fires, the endpoint returns **HTTP 200** with:

```json
{
  "ok": false,
  "scope": "main",
  "provider": "nous",
  "model": "x-ai/grok-4.5",
  "confirm_required": true,
  "confirm_message": "<human-readable cost warning>"
}
```

The client must re-POST with `"confirm_expensive_model": true`. **A 200 does not mean the model was
set — always check `ok`.**

**Auxiliary responses** (`web_server.py:7422`, `:7457-7462`):

```json
{"ok": true, "scope": "auxiliary", "reset": true}
```
```json
{"ok": true, "scope": "auxiliary", "tasks": ["vision"], "provider": "nous", "model": "x-ai/grok-4.5"}
```

**Errors:** 400 `"scope must be 'main' or 'auxiliary'"` (`:7228`), 400
`"provider and model required for main"` (`:7285`), 400 `"provider required for auxiliary"` (`:7425`),
400 `"unknown auxiliary task: <slot>"` (`:7430`), 500 `"Failed to save model assignment"` (`:7268`).
FastAPI error envelope is `{"detail": "<message>"}`, **not** the OpenAI `{"error": {...}}` shape used
by the API server.

> **Bottom line for the extension:** if you only talk to `:8642`, **you cannot change the global
> default model.** You can only lock a model per session. Present model selection as
> "model for this chat", and route it through `POST /api/sessions/{id}/model` or the session
> creation body.

---

## 7. Routes that depend on a capability / precondition

### 7.1 Capability flag vs. actual registration — the `jobs_admin` discrepancy

| Capability flag | Value | Routes actually registered |
|---|---|---|
| `features.jobs_admin` | `false` (`api_server.py:3190`) | **8 `/api/jobs*` routes ARE registered** (`api_server.py:2086-2093`), plus the conditional `POST /api/cron/fire` (`:2104`) |

The jobs handlers do **not** consult the capability flag. They gate on
`_check_jobs_available()` (`api_server.py:5691-5698`), which checks the module-level
`_CRON_AVAILABLE` and returns **HTTP 501** on failure:

```json
{"error": "Cron module not available"}
```

Note that is a **plain-string** `error`, not the OpenAI envelope. `_handle_list_jobs` at
`api_server.py:5714-5727` shows the pattern; `POST /api/jobs` at `:5729-5736` is identical.

Also note `("POST", "/api/cron/fire", …)` is appended to the route table **only if `_CRON_AVAILABLE`**
(`api_server.py:2101-2104`) — so that one path genuinely 404s when cron is missing, while the
`/api/jobs*` paths 501.

**Guidance:** `features.jobs_admin: false` should be treated as **authoritative** — do not build a
jobs UI against it. But if you do call `/api/jobs`, expect **200 or 501**, not 404. Job ids are
validated against `self._JOB_ID_RE` (`api_server.py:5700-5708`) → **400** on a malformed id.

### 7.2 Explicit capability→route mapping

| `features` key | Value | Route(s) it gates | Behavior if you call anyway |
|---|---|---|---|
| `chat_completions` | true | `POST /v1/chat/completions` | works |
| `responses_api` | true | `POST /v1/responses`, `GET/DELETE /v1/responses/{id}` | works |
| `run_submission` / `run_status` / `run_events_sse` / `run_stop` / `run_steer` / `run_approval_response` | true | `/v1/runs*` | works |
| `session_resources` | true | `/api/sessions*` CRUD | works |
| `session_chat` / `session_chat_streaming` | true | `/api/sessions/{id}/chat[/stream]` | works |
| `session_fork` | true | `POST /api/sessions/{id}/fork` | works |
| `session_model_lock` | true | `POST /api/sessions/{id}/model` | works |
| `model_options` | true | `GET /api/model/options` | works |
| `skills_api` | true | `GET /v1/skills` | works |
| `admin_config_rw` | **false** | *(no route exists)* | **404** |
| `memory_write_api` | **false** | *(no route exists)* | **404** |
| `audio_api` | **false** | *(no route exists)* | **404** |
| `realtime_voice` | **false** | *(no route exists)* | **404** |
| `jobs_admin` | **false** | `/api/jobs*` **do exist** | 200 or **501** — see §7.1 |
| *(no flag)* | — | `GET /v1/toolsets` | Only advertised via `endpoints.toolsets` |
| `cors` | config | affects *all* routes when an `Origin` header is present | **403** empty body if `false` |

### 7.3 Non-capability preconditions

| Precondition | Affected routes | Failure |
|---|---|---|
| Session row must exist | every `/api/sessions/{id}/*` | **404** `session_not_found` (`api_server.py:3379`) |
| Session DB must be reachable | all `/api/sessions*` | **503** `session_db_unavailable` (`api_server.py:3372`, `:3400`, `:3445`, `:3586`) |
| `X-Hermes-Session-Id` continuation requires an API key | `POST /v1/chat/completions`, `POST /v1/responses` | **403** — *"Session continuation requires API key authentication. Configure API_SERVER_KEY to enable this feature."* (`api_server.py:4245-4251`) |
| Session id / key header sanity | header-carrying routes | ≤256 chars (`_MAX_SESSION_HEADER_LEN`, `api_server.py:2118`); rejected on `\r\n\0` or path-unsafe shapes (`api_server.py:4256-4258`) |
| Concurrency cap | `POST /v1/chat/completions` (and other `@_admit_api_agent_request` handlers) | `_concurrency_limited_response()` (`api_server.py:4166-4168`) → **429** `{"error":{"message":"Too many concurrent runs (max N)","type":"rate_limit_error","param":null,"code":"rate_limit_exceeded"}}` with a `Retry-After: 1` header (`api_server.py:6247-6277`); the cap is disabled when `_max_concurrent_runs <= 0` |
| Body size | all | `client_max_size=MAX_REQUEST_BYTES` + `body_limit_middleware` (`api_server.py:7461-7471`); `MAX_REQUEST_BYTES = 10_000_000` (10 MB, `api_server.py:154`) |
| `_CRON_AVAILABLE` | `/api/jobs*` | **501** `{"error": "Cron module not available"}` |
| `_CRON_AVAILABLE` | `POST /api/cron/fire` | route not registered → **404** |
| Unknown `/p/<profile>/` prefix | all mirrored routes | **404** `{"error": "Unknown or unconfigured profile"}` |

### 7.4 Auth exceptions

`GET /health` and `GET /v1/health` (both `_handle_health`, `api_server.py:2990-2994`) are the **only**
routes whose handlers skip `_check_auth`.

**Correction — `/health/detailed` IS authenticated.** `_handle_health_detailed` calls `_check_auth`
at `api_server.py:3003` and its docstring says so explicitly (*"Requires the same Bearer auth as
other API routes"*, `api_server.py:2996-3001`). Verified live on :8642 with no Authorization header:
`/health` → **200**, `/v1/health` → **200**, `/health/detailed` → **401** `gateway_auth_failed`.

Two routes use a **different** authenticator, not `API_SERVER_KEY`:
- `POST /api/platforms/{platform}/events` — verified by the target adapter's own platform-signed
  bearer (`api_server.py:2081-2084`).
- `POST /api/cron/fire` — verified by a NAS-minted JWT (`api_server.py:2101-2103`, `:5927`).

Do not send `API_SERVER_KEY` to those.

---

## 8. Quick reference for the implementation agent

```
BASE = http://127.0.0.1:8642
AUTH = Authorization: Bearer <API_SERVER_KEY from C:\Users\<usuario>\AppData\Local\hermes\.env>

Bootstrap:
  GET  /health                    → no auth; {"status","platform","version"}
  GET  /v1/capabilities           → auth; validates the key + full feature map

Discovery (all GET, all auth, none paginated, none filtered):
  GET  /v1/models                 → OpenAI list; virtual model + route aliases only
  GET  /api/model/options         → ?refresh=true|false; providers[] + model + provider
  GET  /v1/skills                 → {object:"list", data:[{name,description,category}]}
  GET  /v1/toolsets               → {object:"list", platform:"api_server",
                                     data:[{name,label,description,enabled,configured,tools[]}]}

Model selection (session scope only on this server):
  POST /api/sessions              {id?,source?,model?,provider?,model_options?,require_model_lock?,title?,system_prompt?}
  POST /api/sessions/{id}/model   {provider,model,model_options?}   → 200 hermes.session.model_lock
  PATCH /api/sessions/{id}        ONLY {title,end_reason,pinned,archived,hidden,unread}

Hard "no" list on :8642
  - no global default-model setter          (that is POST /api/model/set on the dashboard server)
  - no context_window / vision / tools info (that is GET /api/model/info on the dashboard server)
  - no enabled flag on skills               (disabled skills are simply absent)
  - no way to toggle toolsets               (features.admin_config_rw === false)
  - no pagination anywhere in discovery
  - bare `model` with no `provider` on /v1/chat/completions is IGNORED unless
    platforms.api_server.extra.direct_model_requests is true (default false)
```

### Error envelope reference

OpenAI-style (`_openai_error`, `api_server.py:1091-1100`) — used by nearly every API-server route:

```json
{"error": {"message": "…", "type": "invalid_request_error", "param": null, "code": "…"}}
```

Auth failure (`api_server.py:1832-1835`) — a **different** shape, no `param`:

```json
{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}
```

Jobs unavailable (`api_server.py:5695-5697`) — plain string:

```json
{"error": "Cron module not available"}
```

Unknown profile (`api_server.py:2041`) — plain string:

```json
{"error": "Unknown or unconfigured profile"}
```

Dashboard server (FastAPI) — different again:

```json
{"detail": "…"}
```

**A client must handle all five shapes.** Parse defensively:
`err.error?.message ?? err.error ?? err.detail ?? "<unknown>"`.

---

## 9. Open items / UNVERIFIED

1. No authenticated live probe was performed — every response body here is reconstructed from source
   literals and test assertions. **Recommend the implementation agent make one authenticated
   `GET /v1/capabilities` call and diff it against §1.2** before relying on the reconstructions.
2. The dashboard web server's **port and auth scheme** on this machine were not determined.
   `POST /api/model/set` and `GET /api/model/info` are unreachable until that is established.
3. Exact `tools[]` membership per toolset — depends on the live registry; only `web`, `terminal`,
   and the test fixtures are confirmed.
4. ~~`_SKILLS_CACHE_TTL_SECONDS` value~~ — **RESOLVED**: `30.0` seconds (`tools/skills_tool.py:102`).
5. ~~`MAX_REQUEST_BYTES` value and the `_concurrency_limited_response()` status code~~ — **RESOLVED**:
   `MAX_REQUEST_BYTES = 10_000_000` (`api_server.py:154`); concurrency cap returns **429** with
   `rate_limit_error` / `rate_limit_exceeded` and `Retry-After: 1` (`api_server.py:6247-6277`).
6. `cron_model_impact` field type in the `POST /api/model/set` response.
7. Whether an out-of-set `reasoning.effort` is rejected on the session-chat path.
8. Whether `stt` (a `_CONFIG_ONLY_TOOLSETS` member) yields an empty `tools[]` in `/v1/toolsets`.
