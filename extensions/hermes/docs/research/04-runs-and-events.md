# Hermes RUNS API + EVENT STREAM — ground truth for the Raycast extension

**Research date:** 2026-08-19
**Source of truth:** `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent` (read-only reference).
Primary file: `gateway/platforms/api_server.py` (7638 lines).
Test file: `tests/gateway/test_api_server_runs.py` (802 lines).
Live probes against `http://127.0.0.1:8642` (Hermes API server, aiohttp 3.14.3, Python 3.11, Hermes `0.20.4`).

Every claim below carries a `file:line` citation or an observed HTTP response. Anything I could not
verify is explicitly labelled **UNVERIFIED**.

**Fact-check pass — 2026-08-19.** An adversarial re-verification against the live source corrected
~35 citations that pointed at the wrong lines (including one that pointed past the end of the test
file, and several that landed on unrelated code), corrected two code literals, and resolved two
formerly **UNVERIFIED** items (`_draining_response` body, `_get_approval_timeout` default) by reading
the functions. All route paths, handler names, status string literals, event type names, response
body key names, and error `code` values in this document were re-checked and are accurate as written;
the live `/health` and 401 responses in §0.2/§0.3 were re-probed and match byte for byte.

---

## 0. Orientation, base URL and auth

### 0.1 Endpoint table (verified against the router)

The whole route table is registered in `gateway/platforms/api_server.py:2059-2100`. The runs slice:

| Method | Path | Handler | Handler line |
|---|---|---|---|
| POST | `/v1/runs` | `_handle_runs` | `api_server.py:6674` |
| GET | `/v1/runs/{run_id}` | `_handle_get_run` | `api_server.py:7089` |
| GET | `/v1/runs/{run_id}/events` | `_handle_run_events` | `api_server.py:7104` |
| POST | `/v1/runs/{run_id}/approval` | `_handle_run_approval` | `api_server.py:7156` |
| POST | `/v1/runs/{run_id}/steer` | `_handle_steer_run` | `api_server.py:7244` |
| POST | `/v1/runs/{run_id}/stop` | `_handle_stop_run` | `api_server.py:7304` |

Registration lines: `api_server.py:2094-2099`.
There is **no** `GET /v1/runs` (list) route — see §7.

### 0.2 Ports (observed live)

```
$ curl -s http://127.0.0.1:8642/health
{"status": "ok", "platform": "hermes-agent", "version": "0.20.4"}

$ curl -s http://127.0.0.1:8644/health
{"status": "ok", "platform": "webhook"}
```

**Port 8642 is the API server.** Port 8644 is a *different* adapter (`platform: "webhook"`) and does
**not** serve `/v1/runs`. The Raycast extension must target 8642 (or whatever
`gateway.api_server` is configured to bind).

### 0.3 Auth

All six runs endpoints require `Authorization: Bearer <API_SERVER_KEY>`.

* `GET`/`POST` handlers call `self._check_auth(request)` first
  (`api_server.py:7091-7093`, `7106-7108`, `7158-7160`, `7246-7248`, `7306-7308`).
* `POST /v1/runs` is decorated with `@_admit_api_agent_request` (`api_server.py:6673`), and that
  decorator calls `_check_auth` before anything else (`api_server.py:1119-1121`).
* Comparison is timing-safe `hmac.compare_digest` on the raw Bearer token (`api_server.py:1825`).

**Observed 401 body (live, no Authorization header):**

```
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: no-referrer

{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}
```

Note the error envelope for auth is **flat** (`error.message/type/code`, no `param`), unlike the
OpenAI-style envelope used by every other error (§0.4).

**Where the key lives (path + name only, never the value):**

* Env / dotenv file: `C:\Users\<usuario>\AppData\Local\hermes\.env`, variable name **`API_SERVER_KEY`**
  (present at line 478 of that file).
* Read in code at `api_server.py:1383`:
  `self._api_key: str = extra.get("key", _get_scoped_secret("API_SERVER_KEY", ""))` — i.e. the
  config key `platforms.api_server.key` in `C:\Users\<usuario>\AppData\Local\hermes\config.yaml` takes
  precedence, otherwise the scoped secret `API_SERVER_KEY`.
* The server refuses to start without it, including on loopback (`api_server.py:7388-7431`),
  minimum length 16 (`api_server.py:7415`).

**Never read, log, or embed the value.** Have the user paste it into a Raycast Password preference.

### 0.4 Standard error envelope

`_openai_error()` at `api_server.py:1091-1101`:

```json
{
  "error": {
    "message": "Run not found: run_abc",
    "type": "invalid_request_error",
    "param": null,
    "code": "run_not_found"
  }
}
```

Error `code` values relevant to runs, all verified in source:
`run_not_found`, `invalid_approval_choice`, `approval_not_active`, `approval_not_pending`,
`run_not_accepting_steer`, `invalid_steer_input`, `steer_failed`, `rate_limit_exceeded`,
`body_too_large`, `invalid_content_length`.

### 0.5 Global request limits

* Max request body: `MAX_REQUEST_BYTES = 10_000_000` (10 MB) — `api_server.py:154`; enforced by
  `body_limit_middleware` (`api_server.py:1165-1183`) → `413 body_too_large`, and by
  `client_max_size=MAX_REQUEST_BYTES` on the app (`api_server.py:7471`).
* Concurrency cap: `gateway.api_server.max_concurrent_runs` in `config.yaml`, default **10**, `0`
  disables (`api_server.py:1627-1646`). Exceeding it → **429** with `Retry-After: 1`
  (`api_server.py:6247-6277`):

```json
{"error":{"message":"Too many concurrent runs (max 10)","type":"rate_limit_error","param":null,"code":"rate_limit_exceeded"}}
```

The cap is shared across `/v1/chat/completions`, `/v1/responses` and `/v1/runs`
(`api_server.py:1452-1456`).

---

## 1. `POST /v1/runs` — start a run

Handler: `api_server.py:6674-7087`.

### 1.1 Accepted request-body fields — the COMPLETE list

I grepped every `body.get(...)` inside the handler body (lines 6674-7080). There are exactly seven
reads. **Nothing else in the body is looked at — unknown keys are silently ignored.**

| Field | Type | Required | Line | Semantics |
|---|---|---|---|---|
| `input` | `string` \| `array` | **yes** | `6692` | The prompt. See §1.2. |
| `instructions` | `string` | no | `6700` | Ephemeral system prompt for this run only (assigned at `api_server.py:6768`, passed as `ephemeral_system_prompt` to `_create_agent` at `api_server.py:6827-6828`). |
| `previous_response_id` | `string` | no | `6701` | Responses-API continuation; pulls `conversation_history` + `session_id` + `instructions` out of the in-memory `ResponseStore` (`api_server.py:6723-6730`). |
| `conversation_history` | `array<{role,content}>` | no | `6705` | Explicit prior turns. **Wins over `previous_response_id`** (`api_server.py:6702-6733`). |
| `session_id` | `string` | no | `6747` | Conversation/transcript scope. Defaults to the generated `run_id` (`api_server.py:6761`). Also becomes the agent's `task_id` (`api_server.py:6906-6910`). |
| `model` | `string` | no | `6748`, `6804` | Model alias or raw provider model id. Also used for `model_routes` lookup (`_resolve_route`, `api_server.py:2317-2321`). |
| `provider` | `string` | no | — (read inside `_request_agent_overrides`, `api_server.py:399-401`) | Provider slug, e.g. `"minimax"`. |
| `model_options` | `object` | no | — (`api_server.py:407-409`) | Free-form dict forwarded to the agent, e.g. `{"reasoning_effort":"medium","service_tier":"priority"}`. |

`model`/`provider`/`model_options` are extracted by
`_request_agent_overrides(body, virtual_model=self._model_name)` at `api_server.py:6749`. Notes:

* A `model` equal to the advertised virtual model (usually `"hermes-agent"`) is treated as
  "use the gateway default" and dropped (`api_server.py:403-405`).
* On `/v1/runs`, a bare `model` **without** `provider` IS honored (`allow_bare_model` defaults to
  `True`; the docstring at `api_server.py:386-393` calls `/v1/runs` a "Hermes-native endpoint" that
  "always allow[s] it").
* Test proof: `tests/gateway/test_api_server_runs.py:231-261` asserts `requested_model`,
  `requested_provider`, `model_options` reach `_create_agent`.

### 1.2 `input` shapes

`api_server.py:6692-6698`:

```python
raw_input = body.get("input")
if not raw_input:
    return web.json_response(_openai_error("Missing 'input' field"), status=400)
user_message = raw_input if isinstance(raw_input, str) else (raw_input[-1].get("content", "") if isinstance(raw_input, list) else "")
if not user_message:
    return web.json_response(_openai_error("No user message found in input"), status=400)
```

* `input` as a **string** → used verbatim as the user message.
* `input` as an **array** → the **last** element's `content` is the user message; every earlier
  element with both `role` and `content` becomes conversation history (`api_server.py:6734-6746`),
  and multi-part content blocks in those earlier messages are flattened by joining `part["text"]`
  for parts with `type == "text"` (`api_server.py:6740-6744`).
* **Caveat:** the *last* message's `content` is NOT flattened — it is passed straight through to
  `agent.run_conversation(user_message=...)` (`api_server.py:6906-6910`). If you send a content-block
  array as the last element, the agent receives a list, not a string. For the Raycast extension,
  **send `input` as a plain string.**

### 1.3 Fields that DO NOT EXIST on `POST /v1/runs`

These were explicitly asked about. All confirmed absent from the handler:

`skills`, `toolsets`, `tools`, `approval_mode` / `permission_mode`, `cwd` / `working_directory`,
`timeout`, `metadata`, `idempotency_key`, `stream`, `title`, `tags`, `webhook`, `callback_url`.

Consequences:

* **Toolsets are server-side config, not per-request.** They come from
  `config.yaml → platform_toolsets.api_server`, falling back to the `hermes-api-server` default
  (`_create_agent` docstring, `api_server.py:2664-2666`). Read them with `GET /v1/toolsets`
  (`api_server.py:2067`).
* **Skills are server-side too.** `GET /v1/skills` lists them (`api_server.py:2066`,
  handler `api_server.py:3226-3256`); there is no way to select skills per run.
* **cwd is not settable.** Tools execute on the API-server host
  (`/v1/capabilities → runtime.tool_execution == "server"`, `api_server.py:3159-3168`; the literal is at `:3161`).
* **No idempotency.** Two identical POSTs create two independent runs with different `run_id`s.
  The extension must dedupe client-side (e.g. disable the submit button until the 202 lands).
* **No per-run timeout.** The only lifecycle timers are `_RUN_STREAM_TTL = 300 s` (transport buffer)
  and `_RUN_STATUS_TTL = 3600 s` (terminal status retention) — `api_server.py:6562-6563`, §7.2.

### 1.4 Request headers

| Header | Required | Effect |
|---|---|---|
| `Authorization: Bearer <API_SERVER_KEY>` | yes | §0.3 |
| `Content-Type: application/json` | yes | body parsed with `request.json()` (`api_server.py:6688`) |
| `X-Hermes-Session-Key` | optional | Long-term-memory scope. Validated at `api_server.py:6677-6679` → `_parse_session_key_header` (`api_server.py:2120-2171`). Requires an API key to be configured (403 otherwise), rejects `\r\n\x00`, max 256 chars (`_MAX_SESSION_HEADER_LEN`, `api_server.py:2118`). Echoed back on the 202 (`api_server.py:7080-7086`). |

`X-Hermes-Session-Id` is **not** read by `/v1/runs` (that header belongs to `/v1/chat/completions`).
Use the `session_id` body field instead.

### 1.5 Literal request examples

Minimal:

```json
{"input": "hello"}
```

(from `tests/gateway/test_api_server_runs.py:137` — `resp = await cli.post("/v1/runs", json={"input": "hello"})`)

With a session:

```json
{"input": "hello", "session_id": "space-session"}
```

(`tests/gateway/test_api_server_runs.py:285-288`)

With model routing (literal, from `tests/gateway/test_api_server_runs.py:244-250`):

```json
{
  "input": "hello",
  "model": "MiniMax-M3",
  "provider": "minimax",
  "model_options": {"reasoning_effort": "medium", "service_tier": "priority"}
}
```

Full realistic body for the Raycast extension:

```json
{
  "input": "Refactor the auth module and run the tests",
  "instructions": "You are running headless from Raycast. Be concise.",
  "session_id": "raycast-2026-08-19-a1b2c3",
  "conversation_history": [
    {"role": "user", "content": "earlier question"},
    {"role": "assistant", "content": "earlier answer"}
  ]
}
```

### 1.6 Response — `202 Accepted`

Constructed at `api_server.py:7083-7087`. The body has **exactly two keys**:

```json
{"run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12", "status": "started"}
```

* `run_id` format: `f"run_{uuid.uuid4().hex}"` — `run_` + 32 lowercase hex chars
  (`api_server.py:6759`).
* `status` is the literal string `"started"` — **and this string appears NOWHERE else**. It is not a
  run status in `_run_statuses`; the pollable status at that instant is `"queued"` or already
  `"running"`. Do not add `"started"` to your status enum.
* Response headers: `X-Hermes-Session-Key: <echo>` only when the request sent that header
  (`api_server.py:7080-7082`), plus the seven global security headers (`api_server.py:1188-1196`).

Test proof: `tests/gateway/test_api_server_runs.py:137-140`.

### 1.7 Error responses from `POST /v1/runs`

| Status | Condition | Line | Body |
|---|---|---|---|
| 400 | body is not valid JSON | `6690` | `{"error":{"message":"Invalid JSON","type":"invalid_request_error","param":null,"code":null}}` |
| 400 | `input` missing/empty | `6693` | `... "message":"Missing 'input' field" ...` |
| 400 | array `input` with no extractable content | `6698` | `... "message":"No user message found in input" ...` |
| 400 | `conversation_history` not an array | `6710` | `... "'conversation_history' must be an array of message objects" ...` |
| 400 | history entry missing `role`/`content` | `6715` | `... "conversation_history[2] must have 'role' and 'content' fields" ...` |
| 400 | `provider` conflicts with a `model_routes` entry | `6750-6758` | see `_request_route_conflict_error`, `api_server.py:2606-2639` |
| 401 | bad/missing Bearer | `1119` | §0.3 |
| 403 | `X-Hermes-Session-Key` sent but no API key configured | `2150` | `... "X-Hermes-Session-Key requires API key authentication..." ...` |
| 413 | body > 10 MB | `1172` | `code: "body_too_large"` |
| 429 | concurrency cap | `6683` | `code: "rate_limit_exceeded"`, header `Retry-After: 1` |
| 503 | gateway draining/shutting down | `1123-1125` (call); `1559-1570` (`_draining_response`) | `{"error":{"message":"Gateway is draining existing work; retry shortly.","type":"invalid_request_error","param":null,"code":"gateway_draining"}}` + `Retry-After: 1` |

---

## 2. `GET /v1/runs/{run_id}` — poll run status

Handler: `api_server.py:7089-7102`. Three lines of logic:

```python
run_id = request.match_info["run_id"]
status = self._run_statuses.get(run_id)
if status is None:
    return web.json_response(_openai_error(f"Run not found: {run_id}", code="run_not_found"), status=404)
return web.json_response(status)
```

The response body **is the raw status dict**, so its exact shape is defined by `_set_run_status`
(`api_server.py:6565-6578`):

```python
current.update({"object": "hermes.run", "run_id": run_id, "status": status, "updated_at": now})
current.setdefault("created_at", fields.pop("created_at", now))
current.update(fields)
```

Fields **accumulate** across calls (`current` is the previously stored dict, never reset). So a
completed run's body still carries `session_id` and `model` from its `queued` write.

### 2.1 Literal response bodies

Just after POST (`api_server.py:6799-6805`):

```json
{
  "object": "hermes.run",
  "run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12",
  "status": "queued",
  "updated_at": 1755631200.114,
  "created_at": 1755631200.114,
  "session_id": "raycast-2026-08-19-a1b2c3",
  "model": "hermes-agent"
}
```

Mid-run, after a tool event (`_push` rewrites `last_event`, `api_server.py:6582-6587`):

```json
{
  "object": "hermes.run",
  "run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12",
  "status": "running",
  "updated_at": 1755631207.902,
  "created_at": 1755631200.114,
  "session_id": "raycast-2026-08-19-a1b2c3",
  "model": "hermes-agent",
  "last_event": "tool.started"
}
```

Completed (`api_server.py:6983-6990`):

```json
{
  "object": "hermes.run",
  "run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12",
  "status": "completed",
  "updated_at": 1755631240.551,
  "created_at": 1755631200.114,
  "session_id": "raycast-2026-08-19-a1b2c3",
  "model": "hermes-agent",
  "last_event": "run.completed",
  "output": "Done. I refactored auth.py and all 42 tests pass.",
  "usage": {"input_tokens": 10, "output_tokens": 5, "total_tokens": 15},
  "pending_steer": "tighten the ending"
}
```

`pending_steer` is present **only** when the agent returned one (`api_server.py:6969`, `6989`).
Test proof: `tests/gateway/test_api_server_runs.py:531-559`.

Failed (`api_server.py:6959-6966` / `7014-7021` / `7031-7038`):

```json
{
  "object": "hermes.run",
  "run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12",
  "status": "failed",
  "updated_at": 1755631205.2,
  "created_at": 1755631200.114,
  "session_id": "raycast-2026-08-19-a1b2c3",
  "model": "hermes-agent",
  "last_event": "run.failed",
  "error": "⚠️ Provider authentication failed: No credentials found for provider 'nous'"
}
```

That exact `error` string is asserted in `tests/gateway/test_api_server_runs.py:801` (the file is 802 lines long).

404 body:

```json
{"error":{"message":"Run not found: run_missing","type":"invalid_request_error","param":null,"code":"run_not_found"}}
```

### 2.2 Field reference

| Field | Always? | Type | Source |
|---|---|---|---|
| `object` | yes | `"hermes.run"` (constant) | `6570` |
| `run_id` | yes | string | `6571` |
| `status` | yes | enum, §2.3 | `6572` |
| `updated_at` | yes | float, unix seconds (`time.time()`) | `6573` |
| `created_at` | yes | float, unix seconds | `6575`, seeded `6802` |
| `session_id` | yes (set at queue time) | string | `6803` |
| `model` | yes (set at queue time) | string; `body["model"]` or the adapter's advertised model name | `6804` |
| `last_event` | after the first event | string, one of the event `event` values | `6586`, `6862`, `6965`, `6988`, `7223`, `7292`, `7317` |
| `output` | only on `completed` | string, the agent's final response | `6986` |
| `usage` | only on `completed` | `{input_tokens,output_tokens,total_tokens}` | `6987`; built at `6931-6935` |
| `pending_steer` | conditional | string | `6989` |
| `error` | only on `failed` | string, secret-redacted | `6963`, `7019`, `7036` |

**All timestamps are float unix seconds, not ISO 8601, not milliseconds.**

### 2.3 EVERY status value — exact string literals

I enumerated every `_set_run_status(...)` call site (`api_server.py:3914, 3962, 4026, 4035, 4039,
6583, 6799, 6813, 6820, 6859, 6945, 6961, 6983, 6992, 7016, 7033, 7223, 7292, 7317`). The complete
set of literals written is **seven**:

| Literal | Written at | Meaning |
|---|---|---|
| `"queued"` | `6799-6805` | Record created by `POST /v1/runs`, background task not yet on the loop. Extremely short-lived (microseconds to a few ms). |
| `"running"` | `6813`; re-asserted `7223` (after approval resolved), `7292` (after steer accepted) | The agent task is executing. |
| `"waiting_for_approval"` | `6858-6863` | A tool hit a dangerous-command guard; the agent's worker thread is BLOCKED on `threading.Event.wait()` inside `tools/approval.py:_await_gateway_decision` until someone answers or the approval timeout (default 300 s) fires. |
| `"stopping"` | `7317` | `POST .../stop` was accepted. Cooperative: the agent has been flagged but the executor thread may still be inside a tool. |
| `"completed"` | `6983-6990` | Agent returned normally. `output` + `usage` present. |
| `"cancelled"` | `6820-6824` (stop arrived before the agent started), `6939-6949` (stop observed after the agent returned), `6991-6996` (`asyncio.CancelledError`) | Terminal, stop-initiated. |
| `"failed"` | `6953-6966` (agent returned `{"failed": true}`), `7014-7021` (`_ProviderAuthResolutionError`), `7031-7038` (any other exception) | Terminal, error. `error` present. |

There is **no** `"started"`, `"pending"`, `"in_progress"`, `"succeeded"`, `"error"`, `"timeout"`, or
`"interrupted"` status. (`"started"` appears only as the POST response's `status` field, §1.6.)

`_push` (`api_server.py:6582-6587`) re-writes the record with the **current** status when forwarding
a tool event, so tool activity never changes the status — it only updates `last_event`.

### 2.4 Mapping to the extension's 7 UI states

Exact 1:1. No synthesis needed.

| Hermes `status` | Raycast UI state |
|---|---|
| `queued` | **Preparando** |
| `running` | **Executando** |
| `waiting_for_approval` | **Aguardando aprovação** |
| `stopping` | **Interrompendo** |
| `completed` | **Concluído** |
| `cancelled` | **Cancelado** |
| `failed` | **Falhou** |

Terminal states = `{completed, cancelled, failed}` — this is the exact set the sweeper treats as
terminal (`api_server.py:7378`).

**Two behavioural gotchas for the state machine:**

1. **`waiting_for_approval` is sticky.** The status returns to `running` only when the approval is
   resolved through `POST /v1/runs/{run_id}/approval` (`api_server.py:7223`). If the same approval
   is answered on another surface (a Telegram `/approve`, the CLI, the desktop app), the run
   genuinely resumes but `GET /v1/runs/{id}` keeps reporting `waiting_for_approval` until the run
   terminates — because `_push` preserves the current status (`api_server.py:6585`). **Treat the
   `approval.responded` / subsequent `tool.*` events on the SSE stream as authoritative, and prefer
   `last_event` over `status` when they disagree.**
2. **`stopping` is not terminal.** After a stop, the run stays `stopping` until the executor thread
   actually exits, then flips to `cancelled`. Verified:
   `tests/gateway/test_api_server_runs.py:678-688` — asserts `"stopping"` while blocked (`:678`), then
   `"cancelled"` after the thread returns (`:688`). Keep polling.

### 2.5 Status lifetime

* `_run_statuses` is a plain in-process `dict` (`api_server.py:1434`). **A gateway restart wipes
  every run's status** → subsequent `GET /v1/runs/{id}` returns 404. The extension must treat a 404
  on a run it believes is live as "server restarted / run lost", not as "run finished".
* Terminal statuses are swept 3600 s (`_RUN_STATUS_TTL`, `api_server.py:6563`) after `updated_at`
  by `_sweep_orphaned_runs_once` (`api_server.py:7374-7383`). Non-terminal statuses are never swept.

---

## 3. `GET /v1/runs/{run_id}/events` — the SSE stream

Handler: `api_server.py:7104-7153`. This is the whole thing, verbatim:

```python
run_id = request.match_info["run_id"]

# Allow subscribing slightly before the run is registered (race condition window)
for _ in range(20):
    if run_id in self._run_streams:
        break
    await asyncio.sleep(0.05)
else:
    return web.json_response(_openai_error(f"Run not found: {run_id}", code="run_not_found"), status=404)

q = self._run_streams[run_id]
self._run_stream_subscribers.add(run_id)

response = web.StreamResponse(
    status=200,
    headers={
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    },
)
await response.prepare(request)

try:
    while True:
        try:
            event = await asyncio.wait_for(q.get(), timeout=30.0)
        except asyncio.TimeoutError:
            await response.write(b": keepalive\n\n")
            continue
        if event is None:
            # Run finished — send final SSE comment and close
            await response.write(b": stream closed\n\n")
            break
        payload = _sse_frame(event)
        await response.write(payload)
except Exception as exc:
    logger.debug("[api_server] SSE stream error for run %s: %s", run_id, exc)
finally:
    self._run_stream_subscribers.discard(run_id)
    self._run_streams.pop(run_id, None)
    self._run_streams_created.pop(run_id, None)

return response
```

### 3.1 Transport facts

| Question | Answer | Citation |
|---|---|---|
| Is it SSE? | Yes — a true streaming response, written frame by frame as events arrive. | `7123-7145` |
| Content-Type | `text/event-stream` (no `charset`) | `7126` |
| Other headers | `Cache-Control: no-cache`, `X-Accel-Buffering: no` | `7127-7128` |
| Long-poll or stream? | **Stream.** It holds the connection open indefinitely and writes as the queue produces. | `7134-7145` |
| Resume via `Last-Event-ID`? | **NO.** The header is never read. | whole handler |
| Resume via `?after=` / `?cursor=` / `?since=`? | **NO.** `request.query` is never touched; only `match_info["run_id"]`. | `7110` |
| Per-event `id:` lines? | **NO.** `_sse_frame(event)` is called without `event=`, so it emits only `data:` (`api_server.py:188-208`). | `7144` |
| Named `event:` lines? | **NO.** The discriminator is the JSON field `"event"` inside the `data:` payload. | `7144` + `_sse_frame` prefix logic at `api_server.py:206-208` |

**Wire format of one frame (exact bytes):**

```
data: {"event": "tool.started", "run_id": "run_9f4c...", "timestamp": 1755631207.902, "tool": "terminal", "preview": "ls -la"}\n\n
```

`_sse_frame` (`api_server.py:188-208`) builds `f"{prefix}data: {json.dumps(data, ensure_ascii=True)}\n\n".encode()`
with `prefix = ""` here. **`ensure_ascii` defaults to `True`**, so non-ASCII text (accented
Portuguese, emoji) arrives as `\uXXXX` escapes inside the JSON string — `JSON.parse` handles that
transparently, but a naive regex-based parser would not.

**Client parser rules:**

* Split on `\n\n`.
* Any chunk starting with `:` is a **comment** — ignore it. The two you will see are literally
  `: keepalive` and `: stream closed`.
* Otherwise strip the leading `data: ` and `JSON.parse` the rest.
* Switch on the parsed object's `event` field.
* An `EventSource`-style parser works too (it ignores comment lines and dispatches everything to the
  default `message` handler because no `event:` line is present) — but Raycast/Node has no native
  `EventSource`, and you need custom headers for auth, so a manual `fetch` + `ReadableStream` reader
  is the right approach.

### 3.2 Buffering, subscription window, single-consumer

* The queue is created **at POST time**, before the agent starts
  (`api_server.py:6770-6773`: `q = asyncio.Queue()` at `:6770`, `self._run_streams[run_id] = q` at `:6772`). It is unbounded
  and nothing drains it until a subscriber attaches. **So there is no race: POST, then GET /events,
  and you receive every event from the very first one.**
* If you subscribe before the queue exists, the handler polls for up to **1 second**
  (20 × 50 ms, `api_server.py:7113-7118`) before returning 404.
* **Exactly one consumer.** Two concurrent GETs on the same run share one `asyncio.Queue`, so each
  event is delivered to only one of them (competing consumers), and whichever exits first pops the
  queue out of `_run_streams` (`api_server.py:7150`), starving the other. **Never open two streams
  for the same run.**

### 3.3 THE CRITICAL LIMITATION: the stream is single-shot and NOT resumable

The `finally` block does `self._run_streams.pop(run_id, None)` (`api_server.py:7150`) on **any**
exit — normal end, client disconnect, network error. Once popped:

1. `_put_event_if_active` (`api_server.py:6778-6781`) checks `self._run_streams.get(run_id) is q`
   and silently drops every subsequent event.
2. `_push` (`api_server.py:6588-6590`) does `q = self._run_streams.get(run_id); if q is None: return`
   — same drop.
3. A **reconnect attempt gets 404** `run_not_found`, because the 1-second poll at
   `api_server.py:7113-7118` never finds the run_id again. Nothing re-creates the queue.

**Implication for the Raycast extension:** the event stream is a live-view luxury, not the source of
truth. The moment the Raycast window closes (or the fetch aborts), the stream is gone forever for
that run. **Recovery is polling `GET /v1/runs/{run_id}` only** (§2), which still gives you
`status`, `last_event`, `output`, `usage`, `error` — but no replay of deltas or tool events.

Design accordingly:
* Keep the SSE connection alive only while a run detail view is open.
* Persist every event you receive into Raycast local storage as you go, so reopening the view can
  render history from your own cache and then fall back to status polling.
* Poll `GET /v1/runs/{id}` every ~2 s whenever no stream is attached.

### 3.4 Heartbeat / keepalive

Every **30.0 s** of queue silence (`asyncio.wait_for(..., timeout=30.0)`, `api_server.py:7136`) the
server writes the literal bytes:

```
: keepalive\n\n
```

(`api_server.py:7138`). Your reader must not treat this as an event and must not treat it as
end-of-stream. Set any client-side idle timeout above 30 s (60 s is a safe floor).

### 3.5 Stream termination

Two-part sentinel:

1. **In-band sentinel:** the run task's `finally` block enqueues Python `None`
   (`api_server.py:7060-7064`, `_put_event_if_active(None)`).
2. The reader sees `event is None` and writes the literal bytes:

```
: stream closed\n\n
```

then `break`s and the aiohttp response ends → **TCP connection closes** (`api_server.py:7140-7143`).

So the client observes: `…terminal event frame… → ": stream closed" comment → EOF`.

Robust clients should treat **either** `": stream closed"` **or** a terminal event
(`run.completed` / `run.failed` / `run.cancelled`) **or** plain EOF as the end. Do not rely on the
comment alone: the `finally` at `api_server.py:7148-7151` runs even if the `await response.write`
raised, and an unclean disconnect skips the comment.

Test proof: `tests/gateway/test_api_server_runs.py:734-768`
(`assert "run.failed" in body or "stream closed" in body`).

### 3.6 EVERY event type on this stream

Twelve types. I found them by enumerating every writer into the run queue
(`api_server.py:6592, 6781, 6790, 6815, 6865, 6940, 6955, 6982, 6998, 7023, 7040, 7062, 7227, 7296`).

Producers:
* `_make_run_event_callback._callback` — the agent's `tool_progress_callback` (`api_server.py:6596-6667`)
* `_text_cb` — the agent's `stream_delta_callback` (`api_server.py:6784-6797`)
* `_run_and_close` — lifecycle (`api_server.py:6811-7068`)
* `_approval_notify` — approval bridge (`api_server.py:6838-6870`)
* `_handle_run_approval` / `_handle_steer_run` — control-plane echoes (`api_server.py:7227`, `7296`)

Every event object carries `event` (string discriminator), `run_id` (string) and `timestamp`
(float unix seconds) — except `approval.request`, which merges the approval payload first and adds
those three keys afterwards (so they are present but the key order differs).

---

#### 3.6.1 `message.delta` — **assistant text deltas**

`api_server.py:6784-6797` (event dict at `:6790-6795`). This is the ONLY carrier of streamed assistant text.

```json
{"event": "message.delta", "run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12", "timestamp": 1755631203.771, "delta": "Hel"}
```

* `delta` is the incremental token text; concatenate them in arrival order.
* A `None` delta is swallowed before enqueueing (`api_server.py:6785-6786`), so you never see a
  null-delta frame. **There is no explicit "message finished" event** — the final assembled text
  arrives separately in `run.completed.output`.
* Guarded by `if run_id not in self._run_streams: return` (`api_server.py:6787`) plus the
  `_put_event_if_active` identity check (`api_server.py:6778-6781`).
* Reasoning/think-block content is filtered upstream and never arrives as a delta
  (`gateway/stream_events.py`, `MessageChunk` docstring).

#### 3.6.2 `tool.started` — **tool call start**

`api_server.py:6598-6606`:

```json
{"event": "tool.started", "run_id": "run_9f4c...", "timestamp": 1755631207.902, "tool": "terminal", "preview": "ls -la /tmp"}
```

* `tool` — the function name, e.g. `"terminal"`, `"read_file"`, `"delegate_task"`.
* `preview` — a short human-readable argument summary built by
  `_build_tool_preview(function_name, display_args)` (`agent/tool_executor.py:1004`), after
  `_redact_tool_args_for_display` (`agent/tool_executor.py:1000-1003`). May be `null`.
* **`args` are NOT transmitted.** The callback signature accepts `args`
  (`api_server.py:6596`) and the agent passes the full redacted dict
  (`agent/tool_executor.py:1005-1007`), but the `tool.started` branch only copies `tool` and
  `preview`. **The Raycast UI can show the tool name and the preview string, nothing more.**
  (Contrast: `/api/sessions/{id}/chat/stream` DOES forward `args` — `api_server.py:3952-3954`.)
* There is no tool-call id, so you cannot correlate a `tool.completed` to a specific concurrent
  `tool.started` other than by name + order.

#### 3.6.3 `tool.completed` — **tool call end**

`api_server.py:6607-6614`:

```json
{"event": "tool.completed", "run_id": "run_9f4c...", "timestamp": 1755631208.314, "tool": "terminal", "duration": 0.412, "error": false}
```

* `duration` — wall-clock seconds, `round(kwargs.get("duration", 0), 3)` (`api_server.py:6612`) — note the
  `.get` default, so a caller that omits `duration` yields `0` rather than an error.
* `error` — boolean, from the agent's `is_error` kwarg (`api_server.py:6613`).
  **Note the rename:** the agent emits `is_error`, the wire field is `error`.
* **Tool OUTPUT is never streamed.** The agent passes `result=display_function_result`
  (`agent/tool_executor.py:1804-1809`) but this branch drops it. Tool results live only in the
  agent's own history.
* There is **no** `tool.failed` event on this stream — failure is `tool.completed` with
  `"error": true`. (`tool.failed` exists only on the session-chat stream, `api_server.py:3952`.)

#### 3.6.4 `reasoning.available`

`api_server.py:6615-6621`:

```json
{"event": "reasoning.available", "run_id": "run_9f4c...", "timestamp": 1755631205.11, "text": "I should check the tests first."}
```

Emitted from `agent/conversation_loop.py:6641`:
`agent.tool_progress_callback("reasoning.available", "_thinking", _think_text[:500], None)` —
so `text` is the model's think-block content, **truncated to 500 chars at the source**.

#### 3.6.5 `subagent.start`

`api_server.py:6622-6665`. Base keys plus an **allowlist** of optional fields — a key is included
only when its value is not `None` (`api_server.py:6654-6656`):

`goal`, `task_count`, `task_index`, `subagent_id`, `child_session_id`, `parent_id`, `depth`,
`model`, `tool_count`, `status`, `summary`, `duration_seconds`, `input_tokens`, `output_tokens`,
`reasoning_tokens`, `api_calls`, `cost_usd`, `files_read`, `files_written`, `output_tail`.

`preview`, `goal`, `summary` and `output_tail` are passed through
`redact_sensitive_text(value, force=True)` before leaving the process
(`preview` at `api_server.py:6628-6631`; `goal`/`summary`/`output_tail` at `6660-6663`).

```json
{
  "event": "subagent.start",
  "run_id": "run_9f4c...",
  "timestamp": 1755631210.0,
  "preview": "Audit the auth module for injection bugs",
  "task_index": 0,
  "task_count": 3,
  "goal": "Audit the auth module for injection bugs",
  "subagent_id": "deleg_7a1c",
  "parent_id": "run_9f4c...",
  "depth": 1,
  "model": "hermes-agent",
  "tool_count": 0,
  "child_session_id": "child-sess-42"
}
```

Emitted from `tools/delegate_tool.py:2674` (`child_progress_cb("subagent.start", preview=goal)`),
relayed with identity kwargs built at `tools/delegate_tool.py:1381-1403`.

#### 3.6.6 `subagent.complete`

Same allowlist and same redaction:

```json
{
  "event": "subagent.complete",
  "run_id": "run_9f4c...",
  "timestamp": 1755631260.4,
  "preview": "Found 2 injection risks in login().",
  "task_index": 0,
  "task_count": 3,
  "goal": "Audit the auth module for injection bugs",
  "subagent_id": "deleg_7a1c",
  "child_session_id": "child-sess-42",
  "status": "completed",
  "summary": "Found 2 injection risks in login().",
  "duration_seconds": 50.4,
  "input_tokens": 18422,
  "output_tokens": 1203,
  "reasoning_tokens": 0,
  "api_calls": 7,
  "cost_usd": 0.0413,
  "files_read": ["auth.py", "tests/test_auth.py"],
  "files_written": [],
  "output_tail": "…"
}
```

`status` values seen at the emitters: the normal path assigns `"completed"` / `"failed"` to a `status`
variable at `tools/delegate_tool.py:3028` and `:3030`, carried into `complete_kwargs["status"]` (`:3226`)
and sent at `:3253`; the exception path sends `status="failed"` (`:3271`); the timeout path sends
`status="timeout"` / `"error"` (`:2865`).
Redaction is regression-tested at `tests/gateway/test_api_server.py:627-654`.

#### 3.6.7 `approval.request` — **approval request** (see §4)

Built at `api_server.py:6840-6867`. The event is the approval payload dict, mutated with the
transport keys:

```json
{
  "command": "rm -rf /var/tmp/build",
  "pattern_key": "rm-rf",
  "pattern_keys": ["rm-rf", "shell-c"],
  "description": "Recursive delete outside the workspace",
  "allow_permanent": true,
  "allow_session": true,
  "request_id": "3b8f1d0c9a2e4f5b8c7d6e5f4a3b2c1d",
  "event": "approval.request",
  "run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12",
  "timestamp": 1755631215.882,
  "choices": ["once", "session", "always", "deny"]
}
```

Emitting this also flips the run status to `waiting_for_approval` (`api_server.py:6859-6863`).

#### 3.6.8 `approval.responded`

`api_server.py:7226-7233`, emitted by the approval endpoint itself:

```json
{"event": "approval.responded", "run_id": "run_9f4c...", "timestamp": 1755631222.4, "choice": "once", "resolved": 1}
```

`choice` is the **normalized** value (aliases already mapped, §4.2). `resolved` is the number of
queue entries unblocked.

#### 3.6.9 `run.steered`

`api_server.py:7295-7301`:

```json
{"event": "run.steered", "run_id": "run_9f4c...", "timestamp": 1755631230.7, "accepted": true}
```

Asserted in `tests/gateway/test_api_server_runs.py:436-439`.

#### 3.6.10 `run.completed` — **final result + usage**

`api_server.py:6973-6982`:

```json
{
  "event": "run.completed",
  "run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12",
  "timestamp": 1755631240.551,
  "output": "Done. I refactored auth.py and all 42 tests pass.",
  "usage": {"input_tokens": 10, "output_tokens": 5, "total_tokens": 15}
}
```

Optional `pending_steer` key when a steer landed after the final response
(`api_server.py:6979-6980`):

```json
{"event":"run.completed","run_id":"run_9f4c...","timestamp":1755631240.551,"output":"done","usage":{"input_tokens":0,"output_tokens":0,"total_tokens":0},"pending_steer":"tighten the ending"}
```

`usage` is built at `api_server.py:6931-6935` from the agent's session counters:

```python
u = {
    "input_tokens": getattr(agent, "session_prompt_tokens", 0) or 0,
    "output_tokens": getattr(agent, "session_completion_tokens", 0) or 0,
    "total_tokens": getattr(agent, "session_total_tokens", 0) or 0,
}
```

**These are SESSION-cumulative counters, not per-run deltas.** No cost field. No cache-token
breakdown.

Test proof: `tests/gateway/test_api_server_runs.py:307-336` asserts `"run.completed"` and the
output text appear in the raw SSE body.

#### 3.6.11 `run.failed` — **errors**

Three emit sites, identical shape (`api_server.py:6955-6960`, `7023-7028`, `7040-7045`):

```json
{"event": "run.failed", "run_id": "run_9f4c...", "timestamp": 1755631205.2, "error": "⚠️ Provider authentication failed: No credentials found for provider 'nous'"}
```

`error` is always passed through `_redact_api_error_text` → `redact_sensitive_text(force=True)`
(`api_server.py:1083-1088`), so secrets are stripped.

Triggers:
1. Agent returned a structured failure `{"failed": true, "error": "..."}` — non-retryable 4xx from
   the provider (`api_server.py:6951-6966`).
2. `_ProviderAuthResolutionError` from `_create_agent` (`api_server.py:7005-7029`).
3. Any other exception (`api_server.py:7030-7046`).

#### 3.6.12 `run.cancelled`

`api_server.py:6815-6819`, `6940-6944`, `6997-7003`. No extra payload:

```json
{"event": "run.cancelled", "run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12", "timestamp": 1755631235.1}
```

---

#### 3.6.13 Events that DO NOT exist on this stream

Explicitly checked and confirmed absent:

* **`run.started`** — exists only on `/api/sessions/{id}/chat/stream` (`api_server.py:3958`).
  On `/v1/runs` the first thing you may see is a `message.delta` or a `tool.started`.
* **`run.stopping`** — the string exists only as a `last_event` value in the status record
  (`api_server.py:7317`), never as an SSE event. **A stop is invisible on the stream until the run
  actually ends** with `run.cancelled`. Poll `GET /v1/runs/{id}` (or optimistically render
  "Interrompendo" from your own 200 response to `/stop`).
* **`tool.failed`** — session-chat stream only (`api_server.py:3952`).
* **`tool.output_risk`** — the agent emits it (`agent/tool_executor.py:1841-1852`,
  `:2667-2678`) but `_callback` has no branch for it, so it is dropped.
* **`_thinking`, `subagent.tool`, `subagent_progress`** — deliberately filtered as
  "high-volume UI noise" (explicit comment, `api_server.py:6666-6669`). Those three are the only names
  that comment lists. Whether a `subagent.text` event type exists upstream at all is **UNVERIFIED**;
  either way `_callback` has no branch for it, so it cannot reach this stream.
* **`error`, `done`, `message.started`, `assistant.delta`, `assistant.completed`** — all belong to
  the session-chat stream vocabulary (`api_server.py:3947-4048`), not here.

### 3.7 About `gateway/stream_events.py` and `gateway/stream_consumer.py`

I read both, as requested. **They are NOT the wire vocabulary of `/v1/runs`.**

`gateway/stream_events.py` defines frozen dataclasses — `MessageChunk`, `MessageStop`,
`Commentary`, `ToolCallChunk`, `ToolCallFinished`, `LongToolHint`, `GatewayNotice`, unioned as
`StreamEvent` — for the **agent → chat-platform-adapter** path (Telegram/Discord/Slack rendering).
`gateway/stream_dispatch.py:40` (`GatewayEventDispatcher`) routes them to
`GatewayStreamConsumer` (`gateway/stream_consumer.py:156`), which is a delivery sink for chat
platforms. Its module docstring states the events "describe *transport*, never *context*" and that
"[n]othing here is persisted to conversation history".

`/v1/runs` does **not** use any of that machinery. It wires the raw legacy callbacks directly
(`stream_delta_callback=_text_cb`, `tool_progress_callback=event_cb` — `api_server.py:6769-6770`)
and hand-builds plain dicts. **Do not model the Raycast client on `stream_events.py`.** The
authoritative vocabulary is §3.6, defined entirely inside `api_server.py:6580-6670`,
`6778-6797`, `6811-7068`, `7226-7233`, `7295-7301`.

---

## 4. `POST /v1/runs/{run_id}/approval`

Handler: `api_server.py:7156-7241`.

### 4.1 What triggers an approval request

A tool hits a dangerous-command guard inside `tools/approval.py`. When a gateway notify callback is
registered for the session key, the guard **blocks the agent's worker thread** on a
`threading.Event` and calls the callback (`tools/approval.py:4177-4260`, `_await_gateway_decision`).
`/v1/runs` registers `_approval_notify` for that purpose (`api_server.py:6899`,
`register_gateway_notify(approval_session_key, _approval_notify)`).

Guard sites that build an approval payload: `tools/approval.py:3562-3569` (execute-code guard),
`tools/approval.py:4770-4790` (dangerous terminal command), `tools/approval.py:5343-5348`
(MCP elicitation consent).

The wait is bounded by the approval timeout (`_get_approval_timeout()`, `tools/approval.py:3221-3232`,
body: `int(_get_approval_config().get("timeout", 300))` — default **300 s**, verified in the function
itself) and is interruptible: `/stop` resolves the pending approval as `"deny"` so the agent unwinds
cleanly (`tools/approval.py:4303-4312`).

**Isolation guarantee (important, security-relevant):** the approval namespace is the **run_id**,
never the session_id (`api_server.py:6767`: `approval_session_key = run_id`, with a long comment at
`6762-6766` explaining that shared `session_id`s must not cross-unblock). Regression test:
`tests/gateway/test_api_server_runs.py:337-405`.

### 4.2 Request body

`api_server.py:7170-7204`. Three recognised keys:

| Field | Type | Required | Line |
|---|---|---|---|
| `choice` | string | **yes** | `7175` |
| `all` | bool-ish | no | `7199` |
| `resolve_all` | bool-ish | no | `7200` |

**There is NO `approval_id` / `request_id` field.** The endpoint resolves the **oldest** pending
approval FIFO (`tools/approval.py:2664`, `targets = [queue.pop(0)]`), or all of them when
`all`/`resolve_all` is truthy (`tools/approval.py:2660-2662`). The underlying
`resolve_gateway_approval` *does* accept a `request_id` (`tools/approval.py:2637`) but the HTTP
handler never passes it (`api_server.py:7208-7212`). So the `request_id` you receive on
`approval.request` is display/correlation only — you cannot target it over HTTP.

**`choice` accepted values** (`api_server.py:7175-7186`):

```python
raw_choice = str(body.get("choice", "")).strip().lower()
aliases = {"approve": "once", "approved": "once", "allow": "once"}
choice = aliases.get(raw_choice, raw_choice)
allowed = {"once", "session", "always", "deny"}
```

| You may send | Normalizes to | Meaning |
|---|---|---|
| `"once"` / `"approve"` / `"approved"` / `"allow"` | `once` | Approve this single execution. |
| `"session"` | `session` | Approve for the rest of this session/run. |
| `"always"` | `always` | Persist to the permanent allowlist (keyed by pattern, not command text). |
| `"deny"` | `deny` | Refuse. The agent receives a BLOCKED result and adapts. |

Case-insensitive and whitespace-trimmed. There is no `"allow_always"` string — it is `"always"`.
Anything else → 400 `invalid_approval_choice`.

`all` / `resolve_all` go through `_coerce_request_bool` (`api_server.py:222-245`), which accepts
real booleans plus the strings `"1"/"true"/"yes"/"on"` and `"0"/"false"/"no"/"off"`.

**Which choices to offer:** use the `choices` array on the `approval.request` event — do not
hardcode. `_approval_event_choices` (`api_server.py:74-77`):

```python
def _approval_event_choices(*, smart_denied: bool, allow_permanent: bool) -> list[str]:
    if smart_denied:
        return ["once", "deny"]
    return ["once", "session", "always", "deny"] if allow_permanent else ["once", "session", "deny"]
```

Parametrized test (`tests/gateway/test_api_server_runs.py:36-51`):

| `smart_denied` | `allow_permanent` | `choices` |
|---|---|---|
| false | true | `["once","session","always","deny"]` |
| false | false | `["once","session","deny"]` |
| true | true | `["once","deny"]` |
| true | false | `["once","deny"]` |

### 4.3 Literal request examples

```json
{"choice": "once"}
```

```json
{"choice": "always", "resolve_all": true}
```

(the second is literal at `tests/gateway/test_api_server_runs.py:384`; `{"choice": "once"}` is literal at `:625`)

### 4.4 Response

**200** (`api_server.py:7237-7242`):

```json
{
  "object": "hermes.run.approval_response",
  "run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12",
  "choice": "always",
  "resolved": 1
}
```

Side effects on success: status → `running` with `last_event: "approval.responded"`
(`api_server.py:7223`), and an `approval.responded` event on the SSE stream
(`api_server.py:7226-7233`).

Errors:

| Status | Condition | Line | `code` |
|---|---|---|---|
| 400 | invalid JSON | `7173` | `null` |
| 400 | bad `choice` | `7180-7186` | `invalid_approval_choice` |
| 401 | bad Bearer | `7158` | `gateway_auth_failed` |
| 404 | no status record for `run_id` | `7163-7167` | `run_not_found` |
| 409 | run has no active approval session (already finished/swept) | `7189-7196` | `approval_not_active` |
| 409 | nothing pending in the queue (`resolved <= 0`) | `7214-7220` | `approval_not_pending` |
| 500 | `resolve_gateway_approval` raised | `7210-7212` | `null` |

### 4.5 Approval payload field reference

Built in `tools/approval.py` then re-decorated by `_approval_notify` (`api_server.py:6840-6867`).

| Field | Type | Source | Notes |
|---|---|---|---|
| `command` | string | `tools/approval.py:4773` | Redacted twice: `redact_sensitive_text(command)` at the guard, then `_redact_approval_command()` again in `_approval_notify` (`api_server.py:6846-6849`, importing from `gateway/run.py:664`). |
| `description` | string | `tools/approval.py:4776` | Human-readable reason, redacted. This is the **risk explanation** — there is no numeric/enum `risk` field. |
| `pattern_key` | string | `tools/approval.py:4774` | Primary guard pattern that fired, e.g. `"rm-rf"`, `"mcp_elicitation"`. |
| `pattern_keys` | array\<string\> | `tools/approval.py:4775` | All matched patterns. |
| `allow_permanent` | bool | `tools/approval.py:4781` | Whether "always" may be offered. |
| `allow_session` | bool | `tools/approval.py:4786` | Whether "session" may be offered. |
| `smart_denied` | bool, **only when true** | `tools/approval.py:4788-4789` | Owner override of a Smart DENY → one-operation only. |
| `request_id` | string (32 hex) | `tools/approval.py:2596` | Auto-added by `_ApprovalEntry.__init__`. Correlation only (§4.2). |
| `event` | `"approval.request"` | `api_server.py:6850` | added by `_approval_notify` |
| `run_id` | string | `api_server.py:6851` | added |
| `timestamp` | float | `api_server.py:6852` | added |
| `choices` | array\<string\> | `api_server.py:6853-6856` | added, see §4.2 |

**There is no `tool_name` and no structured `args` on an approval request.** You get `command`
(the literal shell command or elicitation message), `description`, and the pattern keys. Render
`command` in a monospace block and `description` as the reason.

---

## 5. `POST /v1/runs/{run_id}/steer`

Handler: `api_server.py:7244-7302`.

### 5.1 Semantics

`steer` injects a user message into the run **without interrupting it**. From `AIAgent.steer`
(`run_agent.py:3381-3399`):

> "Inject a user message into the next tool result without interrupting. Unlike interrupt(), this
> does NOT stop the current tool call. The text is stashed and the agent loop appends it to the LAST
> tool result's content once the current tool batch finishes. The model sees the steer as part of
> the tool output on its next iteration."

Multiple steers before the drain point concatenate with newlines (`run_agent.py:3410-3414`).
It is thread-safe.

If the steer is accepted after the final response has already been produced, the turn finalizer
drains it into `result["pending_steer"]`, which the API surfaces on the terminal event and status so
the client can replay it as the next user turn (`api_server.py:6966-6971`, `6989`).

### 5.2 Request body

`api_server.py:7267-7279` (aliases read at `:7270`). Three interchangeable aliases, first non-empty wins:

```python
raw_text = body.get("input") or body.get("message") or body.get("text") or ""
steer_text = _normalize_chat_content(raw_text).strip()
```

| Field | Type |
|---|---|
| `input` | string, or an OpenAI content-block array |
| `message` | same |
| `text` | same |

`_normalize_chat_content` (`api_server.py:478-500`) flattens
`[{"type":"text","text":"…"}, …]` into a plain string, with depth/size/length caps.

Literal:

```json
{"input": "tighten the ending"}
```

(`tests/gateway/test_api_server_runs.py:425`)

### 5.3 Response

**200** (`api_server.py:7302`), asserted verbatim at `tests/gateway/test_api_server_runs.py:429-433`:

```json
{"object": "hermes.run.steer", "run_id": "run_123", "accepted": true}
```

Side effects: status re-written to `running` with `last_event: "run.steered"`
(`api_server.py:7292`), and a `run.steered` event on the stream (`api_server.py:7295-7301`).

Errors:

| Status | Condition | Line | `code` |
|---|---|---|---|
| 400 | empty/unusable text | `7273-7278` | `invalid_steer_input` |
| 400 | body not a JSON object | `3360-3364` (`_read_json_body`, called at `7267`) | `null` |
| 401 | bad Bearer | `7246` | `gateway_auth_failed` |
| 404 | unknown `run_id` | `7252` | `run_not_found` |
| 409 | status is not exactly `"running"`, or the agent object has no `steer` attribute | `7256-7265` | `run_not_accepting_steer` |
| 409 | `agent.steer(text)` returned falsy | `7285-7289` | `steer_not_accepted` |
| 500 | `agent.steer` raised | `7283-7285` | `steer_failed` |

**Gate detail worth knowing:** the guard is `status.get("status") != "running"` — so steering is
rejected while the run is `queued`, `waiting_for_approval`, `stopping`, or terminal. In particular
**stop-then-steer is refused** even though the agent reference is still alive
(`tests/gateway/test_api_server_runs.py:480-527`). In the Raycast UI, disable the steer input unless
the last known status is exactly `running`, and retry once on a 409 if you have just seen a
`approval.responded` event (the status flip is synchronous with that endpoint, so it should be safe).

---

## 6. `POST /v1/runs/{run_id}/stop`

Handler: `api_server.py:7304-7334`. Body after the `_check_auth(request)` preamble (`:7306-7308`):

```python
run_id = request.match_info["run_id"]
agent = self._active_run_agents.get(run_id)
task = self._active_run_tasks.get(run_id)

if agent is None and task is None:
    return web.json_response(_openai_error(f"Run not found: {run_id}", code="run_not_found"), status=404)

self._set_run_status(run_id, "stopping", last_event="run.stopping")
self._stopping_run_ids.add(run_id)

if agent is not None:
    try:
        request_hard_interrupt(agent, "Stop requested via API")
    except Exception:
        pass
    _reap_disconnected_agent_processes(agent, source="api_server_run_stop")

return web.json_response({"run_id": run_id, "status": "stopping"})
```

### 6.1 Request body

**Ignored entirely.** The handler never calls `request.json()`. Send `{}` or no body at all;
`Content-Length: 0` is fine. (Tests post with no JSON body:
`tests/gateway/test_api_server_runs.py:713`, `stop_resp = await cli.post(f"/v1/runs/{run_id}/stop")`;
also `:631` and `:671`.)

### 6.2 Response

**200** (`api_server.py:7334`):

```json
{"run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12", "status": "stopping"}
```

Asserted at `tests/gateway/test_api_server_runs.py:715-717`.

**404** when neither an agent nor a task reference exists for the run — note this checks
`_active_run_agents` / `_active_run_tasks`, **not** `_run_statuses`. So stopping an
already-finished run returns 404 `run_not_found` even though `GET /v1/runs/{id}` still returns its
status. Handle that as "already finished", not as an error.

### 6.3 Is it graceful? YES — cooperative, not a kill

* `request_hard_interrupt(agent, "Stop requested via API")` (`agent/interrupt_compat.py:9-35`)
  prefers `agent.hard_interrupt(message)` and falls back to legacy `agent.interrupt(message)`.
* `AIAgent.hard_interrupt` (`run_agent.py:3315-3324`) just calls
  `AIAgent.interrupt(self, message, hard_cancel=True)`, which **sets flags** and propagates the
  interrupt to any active child/subagents (`run_agent.py:3301-3311`). Nothing is killed; the agent
  unwinds at the next safe boundary.
* A pending approval is unblocked as a `deny` so the worker thread doesn't sit on the 300 s approval
  timeout (`tools/approval.py:4303-4312`).
* Background processes created by this run are reaped, epoch-gated so a sibling run sharing the same
  `session_id` keeps its own processes (`api_server.py:7330-7332`, comment at `:7325-7329` referencing issue #76115).

### 6.4 Resulting status timeline

1. Immediately: `stopping` (`api_server.py:7317`), and `run_id` added to `_stopping_run_ids`
   (`:7318`).
2. **No SSE event is emitted at this moment.** (See §3.6.13.)
3. When the executor thread finally returns, `_run_and_close` re-checks
   `if run_id in self._stopping_run_ids` (`api_server.py:6939`) and emits `run.cancelled` +
   sets status `cancelled` (`api_server.py:6940-6950`).
4. If the stop landed before the agent even started, the pre-flight check at
   `api_server.py:6814-6825` does the same thing without running anything.
5. `finally` (`api_server.py:7048-7068`) unregisters the approval notifier, pushes the `None`
   sentinel (stream closes), and clears `_active_run_agents`, `_active_run_tasks`,
   `_run_approval_sessions`, `_stopping_run_ids`.

The gap between (1) and (3) is **unbounded** — it lasts as long as the current tool call. Verified:
`tests/gateway/test_api_server_runs.py:644-687` keeps the executor blocked, asserts status
`"stopping"` and that the agent/task refs are still tracked, then releases and asserts `"cancelled"`.

**UI guidance:** show "Interrompendo" from the 200 response, keep polling
`GET /v1/runs/{run_id}` until `cancelled` (or `completed` — a run that finishes naturally in the
race window will report `completed`, since the `elif` chain at `api_server.py:6939-6951` checks
`_stopping_run_ids` first but only after `_run_sync` returns).

---

## 7. Is there a LIST endpoint? **NO.**

I read the entire route table (`api_server.py:2059-2100`) and the capabilities map
(`api_server.py:3198-3222`). The only `/v1/runs` routes are the six in §0.1. There is:

* no `GET /v1/runs`
* no `GET /v1/runs?status=running`
* no admin/debug listing of `_run_statuses`

Adjacent surfaces that are **not** substitutes:
* `GET /api/sessions` (`api_server.py:2068`) lists **sessions**, not runs. A `session_id` may map to
  0..N runs, and a run whose `session_id` was auto-generated equals its own `run_id`
  (`api_server.py:6761`) and creates no session row.
* `GET /api/jobs` (`api_server.py:2086`) is the scheduled-jobs surface, unrelated to runs.
* `/v1/capabilities` reports `"jobs_admin": false` (`api_server.py:3189`).

### 7.1 Therefore: the client MUST persist run ids

**Statement for the implementation agent: run tracking is entirely client-side.**

The extension must, on every successful `POST /v1/runs` (202), immediately write to Raycast
`LocalStorage` a record like:

```json
{
  "run_id": "run_9f4c1e2a7b8d4f0a91c3e5d7b6a80f12",
  "session_id": "raycast-2026-08-19-a1b2c3",
  "prompt": "Refactor the auth module and run the tests",
  "created_at": 1755631200114,
  "last_known_status": "queued",
  "last_known_event": null,
  "server_base_url": "http://127.0.0.1:8642"
}
```

Write it **before** rendering anything, so a crash between POST and render does not orphan the run.
Then reconstruct the "active runs" list by iterating stored ids and calling
`GET /v1/runs/{run_id}` for each.

Handle these reconciliation cases:

| Observation | Interpretation | Action |
|---|---|---|
| 200, status in `{queued,running,waiting_for_approval,stopping}` | still live | keep, refresh UI |
| 200, status in `{completed,cancelled,failed}` | finished | cache `output`/`error`/`usage` locally, then it may be evicted server-side after 1 h |
| 404 `run_not_found` | either swept after `_RUN_STATUS_TTL` = 3600 s (`api_server.py:6563`, sweep at `:7374-7383`) **or** the gateway restarted (in-memory dict, `api_server.py:1434`) | mark as "unknown/expired"; do NOT report as failed |

### 7.2 TTLs you must design around

`api_server.py:6562-6563`:

```python
_RUN_STREAM_TTL = 300   # seconds before orphaned runs are swept
_RUN_STATUS_TTL = 3600  # seconds to retain terminal run status for polling
```

Swept by `_sweep_orphaned_runs` every 60 s (`api_server.py:7336-7340`), core at
`_sweep_orphaned_runs_once` (`api_server.py:7342-7383`):

* **Transport TTL (300 s):** a run's SSE queue is dropped when it is older than 300 s **and has no
  connected subscriber** (`api_server.py:7346-7351`). Live control state (agent ref, task ref,
  approval session) **survives** — explicit comment at `api_server.py:7365-7366` and regression test
  `tests/gateway/test_api_server_runs.py:574-633`, which proves that after the sweep the run can
  still be approved and stopped. **Consequence: a long run you never subscribed to loses its event
  queue after 5 minutes, and subscribing afterwards returns 404** — but the run itself keeps going
  and `GET /v1/runs/{id}` keeps working. So: **for any run you care about, attach the SSE stream
  immediately after the 202, or accept status-polling only.**
* **Status TTL (3600 s):** terminal statuses (`completed`/`failed`/`cancelled`) are deleted 1 h after
  `updated_at` (`api_server.py:7374-7383`). Cache the final output client-side before then.

---

## 8. What happens when the HTTP client disconnects? **The run keeps going.**

This is the single most important behaviour for the Raycast use case, and it differs by endpoint.

### 8.1 `/v1/runs` — survives disconnect ✅

Three independent proofs from the source:

1. **The run is a detached asyncio task, not a request coroutine.** `POST /v1/runs` builds
   `_run_and_close()` and does `task = asyncio.create_task(_run_and_close())`
   (`api_server.py:7071`), registers it in `self._active_run_tasks[run_id]` and
   `self._background_tasks` (`:7072-7078`), and **then** returns the 202 (`:7083-7087`). The
   HTTP request completes; the task does not. The code even comments at `api_server.py:6807-6809`:
   *"Background task outlives the HTTP response (and thus the middleware profile scope)."*
2. **The SSE handler's cleanup does not touch the run.** `_handle_run_events`'s `finally`
   (`api_server.py:7148-7151`) does exactly three things — `_run_stream_subscribers.discard`,
   `_run_streams.pop`, `_run_streams_created.pop`. It does **not** call `agent.interrupt`, does
   **not** cancel `_active_run_tasks[run_id]`, and does **not** touch `_run_statuses`. A dropped
   connection is caught by the broad `except Exception` at `:7146-7147` and only logged at
   DEBUG level.
3. **Events are dropped, not the run.** After the pop, `_put_event_if_active`
   (`api_server.py:6778-6781`) and `_push` (`:6588-6590`) simply return, while
   `_set_run_status(...)` continues to record every transition (it writes to `_run_statuses`, a
   different dict) — which is exactly why `GET /v1/runs/{id}` still reports `completed` with
   `output` and `usage` afterwards.

**Closing the Raycast window will NOT cancel the task.** Only `POST /v1/runs/{run_id}/stop` cancels
a run (§6), plus gateway shutdown/drain.

### 8.2 Contrast: `/api/sessions/{id}/chat/stream` — DIES on disconnect ❌

For the same server, `_handle_session_chat_stream` catches
`ConnectionResetError/ConnectionAbortedError/BrokenPipeError/OSError` and calls
`_drain_session_stream_task_on_disconnect(...)` (`api_server.py:4085-4088`; the string is the
`interrupt_message="SSE client disconnected"` argument at `:4087`), which does
`agent.interrupt(interrupt_message)` (`api_server.py:4117`) and logs
*"Session SSE client disconnected; interrupted live run"*. The same pattern exists for
`/v1/chat/completions` and `/v1/responses` streaming (`api_server.py:4689` and `5265`:
`request_hard_interrupt(agent, "SSE client disconnected")`). Those two are the only
`request_hard_interrupt` disconnect sites in the file — an earlier draft of this doc also cited `5285`,
which is not one.

**Conclusion: for a Raycast extension that must survive the window closing, `/v1/runs` is the only
correct endpoint.** Do not build long-running tasks on `/api/sessions/{id}/chat/stream` or on
streaming chat completions.

### 8.3 The one caveat

Surviving ≠ resumable-stream. Per §3.3 the event queue is destroyed on disconnect and a reconnect to
`/events` yields 404. After reopening the Raycast window you get:

* ✅ current `status`, `last_event`, and — when terminal — `output` / `usage` / `error` via
  `GET /v1/runs/{run_id}`
* ✅ full control: `/approval`, `/steer`, `/stop` all keep working (proved by
  `tests/gateway/test_api_server_runs.py:574-633`, which exercises approval + stop *after* the
  transport sweep)
* ❌ no replay of `message.delta`, `tool.*`, `subagent.*`, or a missed `approval.request`

**Mitigation for missed approvals:** if `GET /v1/runs/{id}` reports `waiting_for_approval` and you
have no cached `approval.request` payload, you can still answer blind
(`POST .../approval {"choice":"deny"}` is always safe; `{"choice":"once"}` approves the oldest
pending item sight-unseen). There is **no HTTP endpoint that lists pending approvals for a run** —
`tools/approval.py:2676` defines `list_gateway_approvals()` and `:2698`
`get_pending_gateway_approval()`, but neither is exposed over HTTP by `api_server.py`. So: **persist
every `approval.request` event you receive to local storage immediately.**

---

## 9. Recommended client flow (all steps traceable above)

```
1.  POST /v1/runs  {"input": "...", "session_id": "raycast-<uuid>"}
      → 202 {"run_id":"run_…","status":"started"}
2.  Persist {run_id, session_id, prompt, created_at} to LocalStorage  (§7.1) — BEFORE any render.
3.  GET  /v1/runs/{run_id}/events   (Bearer header; manual fetch + stream reader)
      • ignore lines starting with ':'   (": keepalive" every 30 s, ": stream closed" at the end)
      • strip "data: ", JSON.parse, switch on obj.event   (§3.6)
      • persist approval.request payloads locally           (§8.3)
      • append message.delta.delta to a growing transcript  (§3.6.1)
4.  On approval.request → render obj.choices as buttons     (§4.2)
      POST /v1/runs/{run_id}/approval {"choice":"once"}
5.  Steer only while status === "running"                   (§5.3)
      POST /v1/runs/{run_id}/steer {"input":"..."}
6.  Stop:
      POST /v1/runs/{run_id}/stop      → 200 {"status":"stopping"}
      then poll GET /v1/runs/{run_id} until "cancelled"     (§6.4)
7.  Terminal event (run.completed / run.failed / run.cancelled) or EOF → close reader.
8.  Whenever no stream is attached (window reopened, network blip):
      poll GET /v1/runs/{run_id} every ~2 s                 (§3.3, §8.3)
      404 ⇒ "expired or gateway restarted", NOT "failed"    (§7.1)
```

---

## 10. Open items / UNVERIFIED

* ~~**`_draining_response()` body shape**~~ — RESOLVED during fact-check. `api_server.py:1559-1570`:
  503 with `Retry-After: 1` and body
  `{"error":{"message":"Gateway is draining existing work; retry shortly.","type":"invalid_request_error","param":null,"code":"gateway_draining"}}`.
  Reached from `POST /v1/runs` through `_admit_api_agent_request` at `api_server.py:1123-1125`.
* **Behaviour of a non-string `content` on the last element of an array `input`** — the code path is
  clear (`api_server.py:6696` passes it through unflattened) but I did not find a test exercising it.
  Marked **UNVERIFIED** as an end-to-end behaviour; use string `input`.
* **Live end-to-end run** — not performed. All probes were unauthenticated GETs (`/health` on 8642
  and 8644, plus 401 shapes for `/v1/runs/{id}`, `/v1/runs/{id}/events`, `/v1/capabilities`,
  `/health/detailed`). Every JSON body in §1-§6 is transcribed from source constructors or from
  assertions in `tests/gateway/test_api_server_runs.py`; the timestamp/id values are illustrative
  placeholders of the documented types, not captured wire bytes.
* ~~**`_get_approval_timeout()` default of 300 s**~~ — RESOLVED during fact-check. The function body at
  `tools/approval.py:3221-3232` returns `int(_get_approval_config().get("timeout", 300))` and falls back
  to `300` on `ValueError`/`TypeError`. 300 s confirmed as the default; a `config.yaml`
  `approvals.timeout` value overrides it.
* **Multi-profile URL prefix** (`/p/<profile>/v1/runs/...`, `api_server.py:33-38`) exists when
  `gateway.multiplex_profiles` is on. Not investigated — assume the plain `/v1/...` prefix unless
  the user's config says otherwise. **UNVERIFIED** for this deployment.
