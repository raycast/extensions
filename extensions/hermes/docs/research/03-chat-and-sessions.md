# Hermes CHAT & SESSIONS API — ground truth for the Raycast extension

**Source of truth:** `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\gateway\platforms\api_server.py` (7638 lines, aiohttp).
All `api_server.py:NNNN` citations below refer to that file unless another path is given.

**Live server observed:** `http://127.0.0.1:8642` — `GET /health` → `{"status": "ok", "platform": "hermes-agent", "version": "0.20.4"}`.
Port `8644` is a *different* adapter (`GET /health` → `{"status": "ok", "platform": "webhook"}`) — **do not** point the Raycast extension at 8644.

**Verification method / limits:**
- Every claim is traced to source line numbers, to `tests/gateway/test_api_server*.py`, or to an unauthenticated live HTTP probe (shown verbatim).

> **Adversarial fact-check pass (2026-08-19).** This document was re-verified line-by-line against `api_server.py` (7638 lines, confirmed), `hermes_state.py`, `hermes_state_schema.py`, `hermes_constants.py`, `hermes_cli/web_routers/sessions.py`, `apps/desktop/src/**`, `tests/gateway/**`, and live unauthenticated GETs against 127.0.0.1:8642 and :8644.
> **One substantive claim was wrong and has been corrected:** `/v1/responses` SSE was described as using `ensure_ascii=False`; it does not (see §A.2 "Streaming SSE"). Two secondary corrections: `error.type` on the chat-completions failure chunk is not always the literal `"agent_error"` (§A.1), and `DELETE /api/sessions/{id}` returns `bool(deleted)`, not a guaranteed `true` (§B.6).
> **Roughly 45 `api_server.py:NNNN` citations were off by 1-25 lines and have been re-anchored** to the lines that actually contain the cited code — the largest drifts were in §A.1 (non-streaming response body), §B.7 (messages pagination), and the `/v1/responses` non-streaming body.
> Claims re-verified as **exactly correct** and left untouched include: the full route table, the `_session_response` `safe_keys` tuple, the six-name PATCH `allowed` set, all eleven `/v1/responses` SSE event names and their line anchors, `[DONE]` appearing only at 4681/4713, the `hermes.tool.progress` payload key sets, the `_event_payload` / `_delta` / `_tool_progress` source excerpt, the `/v1/capabilities` feature flags, the `/v1/models` object shape, `_normalize_session_source`'s allowed set, and every live-probe transcript (401 body + security headers, empty-body CORS 403, plain-text 404, `version: 0.20.4`, port 8644 = `platform: webhook`).
- **Authenticated live probes were NOT performed.** Doing so would require reading the `API_SERVER_KEY` secret, which the research brief forbids. Response bodies for authenticated routes below are reconstructed **literally from the `web.json_response({...})` calls in source**, and are marked where a field's runtime value could not be observed. Anything I could not pin to source is explicitly marked **UNVERIFIED**.

---

## 0. Connection basics

### 0.1 Base URL and bind

| Item | Value | Citation |
|---|---|---|
| Default host | `127.0.0.1` | `api_server.py:151` (`DEFAULT_HOST`) |
| Default port | `8642` | `api_server.py:152` (`DEFAULT_PORT`) |
| Host/port config | `platforms.api_server.extra.host` / `.port` in `<HERMES_HOME>/config.yaml`, else env `API_SERVER_HOST` / `API_SERVER_PORT` | `api_server.py:1378-1382` |
| Observed config | `platforms.api_server.extra` has `host` and `port` keys set (values not read) | `C:\Users\<usuario>\AppData\Local\hermes\config.yaml` ~line 555-560 |
| Multiplex prefix | Every route is ALSO registered at `/p/{profile}<path>` | `api_server.py:7477-7478` |

### 0.2 Auth (required on every route below)

- Header: `Authorization: Bearer <API_SERVER_KEY>`; timing-safe byte comparison. `api_server.py:1782-1837`.
- **Where the key lives (PATH + NAME only, value never read):** env var name `API_SERVER_KEY`, defined in `C:\Users\<usuario>\AppData\Local\hermes\.env` (exactly one `^API_SERVER_KEY=` line present). Resolution: `extra["key"]` in config.yaml → scoped secret `API_SERVER_KEY` → `os.environ`. `api_server.py:1383`, `api_server.py:103-124`, `agent/secret_scope.py:132-154`.
- `connect()` refuses to start the listener if the key is missing/weak/unverifiable — fatal, non-retryable, code `api_server_key_invalid`. `api_server.py:7440-7462`.
- **Auth runs before body parsing** on the agent routes (the `@_admit_api_agent_request` decorator calls `_check_auth` first, `api_server.py:1119-1123`). Live-confirmed: posting malformed JSON without a key returns the 401 envelope, not a 400.

**Observed 401 (live, `GET /api/sessions` with no Authorization header):**
```json
{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}
```
Observed response headers on that 401 (security-headers middleware, `api_server.py:1188-1210`):
```
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: no-referrer
```

### 0.3 CORS — relevant to Raycast

`cors_middleware` (`api_server.py:996-1015`) **rejects any request carrying an `Origin` header with 403** unless that origin is in `API_SERVER_CORS_ORIGINS` / `extra.cors_origins` (`_origin_allowed`, `api_server.py:1692-1701`). Requests with **no** `Origin` header are always allowed.

Live-observed:
```
$ curl -i -X OPTIONS http://127.0.0.1:8642/v1/chat/completions -H "Origin: http://localhost:3000"
HTTP/1.1 403 Forbidden
Content-Length: 0
```
→ **The Raycast extension must NOT send an `Origin` header.** Node `fetch` in Raycast does not send one by default; do not add one.

### 0.4 Complete route table (verbatim from `_http_route_table`, `api_server.py:2058-2107`)

```
GET    /health
GET    /health/detailed
GET    /v1/health
GET    /v1/models
GET    /api/model/options
GET    /v1/capabilities
GET    /v1/skills
GET    /v1/toolsets
GET    /api/sessions
POST   /api/sessions
GET    /api/sessions/{session_id}
PATCH  /api/sessions/{session_id}
DELETE /api/sessions/{session_id}
GET    /api/sessions/{session_id}/messages
POST   /api/sessions/{session_id}/fork
POST   /api/sessions/{session_id}/chat
POST   /api/sessions/{session_id}/chat/stream
POST   /api/sessions/{session_id}/model
POST   /v1/chat/completions
POST   /v1/responses
GET    /v1/responses/{response_id}
DELETE /v1/responses/{response_id}
POST   /api/platforms/{platform}/events
GET    /api/jobs ... (cron jobs CRUD)
POST   /v1/runs
GET    /v1/runs/{run_id}
GET    /v1/runs/{run_id}/events
POST   /v1/runs/{run_id}/approval
POST   /v1/runs/{run_id}/steer
POST   /v1/runs/{run_id}/stop
POST   /api/cron/fire            (only when the cron module is importable)
```

**There is NO `PATCH /api/sessions/{id}/model`** — only `POST`. There is no `GET /api/sessions/search` on this server (that route exists only on the *dashboard* FastAPI server, `hermes_cli/web_routers/sessions.py:169`).

---

# A) OpenAI-compatible chat

## A.1 `POST /v1/chat/completions`

Handler: `api_server.py:4164-4523` (`@_admit_api_agent_request` at 4164, `def` at 4165).

### Accepted request body

| Field | Type | Behavior | Citation |
|---|---|---|---|
| `messages` | array, **required** | Missing/not-a-list → 400. Roles handled: `system`, `user`, `assistant`. Any other role is silently dropped. | 4179-4207 |
| `messages[].content` | string \| array of parts | `system` → flattened to text and concatenated with `\n` into an ephemeral system prompt. `user`/`assistant` → `_normalize_multimodal_content`. | 4192-4207 |
| `stream` | bool \| bool-ish string | `_coerce_request_bool`; `"false"`/`"0"`/`"no"`/`"off"` are correctly falsey. Default `false`. | 4185, 222-245 |
| `model` | string | Route alias lookup first (`model_routes`), else a per-request model override — but a **bare** `model` with no `provider` is honored **only** when `extra.direct_model_requests: true` (default **false**). The virtual alias (`hermes-agent`) always means "gateway default". | 4291-4302 (`allow_bare_model=self._direct_model_requests` at 4301), 372-411, 1415-1416 |
| `provider` | string | Always honored (marks the client as Hermes-aware). | 391-393 |
| `model_options` | object | `{"reasoning": {"enabled": bool, "effort": "none\|minimal\|low\|medium\|high\|xhigh"}, "service_tier": "...", "fast": bool}` | 269-312, 2359-2378 |
| `tools`, `tool_choice` | accepted but **only used in the idempotency fingerprint** — Hermes executes tools server-side; client-supplied tool schemas are NOT forwarded to the model. | 4400-4403 |
| any other OpenAI field (`temperature`, `top_p`, `max_tokens`, `n`, `stop`, `user`, …) | **ignored** (never read anywhere in the handler) | 4165-4525 |

Extra request headers:

| Header | Effect | Citation |
|---|---|---|
| `X-Hermes-Session-Id` | Continue an existing Hermes session. History is then loaded **from state.db** (`db.get_messages_as_conversation`, 4273), and the `messages` array's history is *discarded* (only the last user message is used). Requires a configured API key (else 403). Rejects `\r\n\x00`, path-traversal shapes, and >256 chars (400). | 4238-4276 |
| `X-Hermes-Session-Key` | Long-term-memory scope (Honcho etc.). Requires API key (else 403). Rejects control chars (400) and >256 chars (400). Echoed back on the response. | 2120-2170 |
| `Idempotency-Key` | Non-streaming only. Fingerprint = `sha256(repr({k: body.get(k) for k in keys}))` over `["model","provider","model_options","messages","tools","tool_choice","stream"]` (`_make_request_fingerprint`, 1261-1264). TTL 300 s, 1000 entries (`_IdempotencyCache.__init__`, 1213). | 4421-4427, 1211-1256 |

**If no `X-Hermes-Session-Id` is sent**, the session id is *derived* deterministically:
```python
seed = f"{system_prompt or ''}\n{first_user_message}"
session_id = "api-" + sha256(seed.encode()).hexdigest()[:16]
```
`api_server.py:1265-1281`. So Open-WebUI-style clients that resend the whole transcript land on a stable session per conversation.

### Multimodal content parts (`_normalize_multimodal_content`, `api_server.py:551-664`)

Accepted part types:
- Text: `text`, `input_text`, `output_text` → normalized to `{"type": "text", "text": "..."}`.
- Image: `image_url` (Chat-Completions shape `{"url":..., "detail":...}`) and `input_image` (Responses shape, top-level `image_url` string) → both normalized to `{"type":"image_url","image_url":{"url":..., "detail":...}}`.
- Rejected with 400: `file`, `input_file` (`unsupported_content_type`), non-`data:image/` data URLs (`unsupported_content_type`), non-http(s)/non-data URLs (`invalid_image_url`), empty URL (`invalid_image_url`), non-string `detail` (`invalid_content_part`), any unknown part `type` (`unsupported_content_type`).
- A text-only part list collapses back to a plain string joined by `\n`.
- Caps: 65 536 chars per text part (`MAX_NORMALIZED_TEXT_LENGTH`, line 156), 1 000 parts per list (`MAX_CONTENT_LIST_SIZE`, line 157).

**Real multimodal request body** (verbatim from `tests/gateway/test_api_server_multimodal.py:98-118`):
```json
{
  "model": "hermes-agent",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "What's in this image?"},
        {"type": "image_url", "image_url": {"url": "https://example.com/cat.png", "detail": "high"}}
      ]
    }
  ]
}
```

### Non-streaming response body (verbatim shape from `api_server.py:4489-4509`)

```json
{
  "id": "chatcmpl-8f3c1d2e4b5a6c7d8e9f0a1b2c3",
  "object": "chat.completion",
  "created": 1755631234,
  "model": "hermes-agent",
  "choices": [
    {
      "index": 0,
      "message": {"role": "assistant", "content": "Here are the files."},
      "finish_reason": "stop"
    }
  ],
  "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
}
```

- `id` = `"chatcmpl-" + uuid4().hex[:29]` (line 4290).
- `finish_reason` ∈ `"stop"` | `"length"` (partial + error text containing "truncat") | `"error"` (failed, or not-completed with an error). Lines 4455-4460.
- Response headers: `X-Hermes-Session-Id: <effective session id>`, plus `X-Hermes-Session-Key` when the request sent one (4462-4466).

**Degraded (soft-partial) 200 body** — an extra `hermes` block is added (4510-4517):
```json
{
  "id": "chatcmpl-...", "object": "chat.completion", "created": 1755631234, "model": "hermes-agent",
  "choices": [{"index": 0, "message": {"role": "assistant", "content": "partial text"}, "finish_reason": "length"}],
  "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
  "hermes": {"completed": false, "partial": true, "failed": false, "error": "output truncated", "error_code": "output_truncated"}
}
```
plus headers `X-Hermes-Completed: false`, `X-Hermes-Partial: true|false`, `X-Hermes-Error: <redacted, ≤200 chars>`.

### Streaming SSE wire format (`_write_sse_chat_completion`, `api_server.py:4525-4716`)

Response headers (4536-4550):
```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
X-Hermes-Session-Id: <session id>
X-Hermes-Session-Key: <key>   (only when supplied)
```

Frame encoder (`_sse_frame`, `api_server.py:188-207`):
```python
prefix = f"event: {event}\n" if event else ""
return f"{prefix}data: {json.dumps(data, ensure_ascii=ensure_ascii)}\n\n".encode()
```
→ **unnamed** frames are exactly `data: {...}\n\n`; named frames are `event: <name>\ndata: {...}\n\n`. For chat completions `ensure_ascii` defaults to **True** (non-ASCII is `\uXXXX`-escaped on the wire).

Frame sequence:

1. **Role chunk** (unnamed) — 4557-4563:
```
data: {"id": "chatcmpl-...", "object": "chat.completion.chunk", "created": 1755631234, "model": "hermes-agent", "choices": [{"index": 0, "delta": {"role": "assistant"}, "finish_reason": null}]}

```
2. **Content chunks** (unnamed), one per agent delta — 4580-4585 (verified exact):
```
data: {"id": "chatcmpl-...", "object": "chat.completion.chunk", "created": 1755631234, "model": "hermes-agent", "choices": [{"index": 0, "delta": {"content": "Here are "}, "finish_reason": null}]}

```
3. **Tool lifecycle** — named event `hermes.tool.progress` (4578). Two payload shapes:
```
event: hermes.tool.progress
data: {"tool": "terminal", "emoji": "\ud83d\udcbb", "label": "terminal(ls -la)", "toolCallId": "call_terminal_1", "status": "running"}

event: hermes.tool.progress
data: {"tool": "terminal", "toolCallId": "call_terminal_1", "status": "completed"}

```
`running` carries `tool`/`emoji`/`label`/`toolCallId`/`status` (`_on_tool_start`, 4335-4359); `completed` carries only `tool`/`toolCallId`/`status` (`_on_tool_complete`, 4361-4375). Tools whose name starts with `_` (e.g. `_thinking`) are filtered out, and a `completed` without a matching `running` is dropped — verified by `tests/gateway/test_api_server.py:1246-1292`.
4. **Keepalive** while idle ≥ 30 s (`CHAT_COMPLETIONS_SSE_KEEPALIVE_SECONDS`, line 155):
```
: keepalive

```
(a raw SSE comment — clients must tolerate it.)
5. **Finish chunk** (unnamed) — 4656-4665. Note it carries `usage`, which the intermediate chunks do not:
```
data: {"id": "chatcmpl-...", "object": "chat.completion.chunk", "created": 1755631234, "model": "hermes-agent", "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}}

```
On failure the finish chunk additionally carries `error` and `hermes` blocks (4666-4679). **Correction:** `error.type` is *not* always the literal `"agent_error"` — source line 4671 is `type(agent_error).__name__ if agent_error else "agent_error"`, so a mid-stream exception yields the Python exception class name (e.g. `"ValueError"`). Only `hermes.error_code` is a fixed literal (`"output_truncated"` | `"agent_error"`, line 4678):
```json
{"id":"chatcmpl-...","object":"chat.completion.chunk","created":1755631234,"model":"hermes-agent",
 "choices":[{"index":0,"delta":{},"finish_reason":"error"}],
 "usage":{"prompt_tokens":0,"completion_tokens":0,"total_tokens":0},
 "error":{"message":"...redacted...","type":"agent_error"},
 "hermes":{"completed":false,"partial":false,"failed":true,"error":"...","error_code":"agent_error"}}
```
6. **Sentinel** — `data: [DONE]\n\n` (4681). Confirmed present by `tests/gateway/test_api_server.py:1140` (`assert "[DONE]" in body`).

If the agent crashes mid-stream, the server emits one `finish_reason: "error"` chunk followed by `data: [DONE]` (4700-4714).

**Client disconnect semantics:** closing the HTTP connection calls `request_hard_interrupt(agent, "SSE client disconnected")` and reaps the agent's background processes (4682-4699). Aborting a Raycast stream therefore genuinely stops the LLM turn.

---

## A.2 `POST /v1/responses` — what it is and how it differs

Handler: `api_server.py:5326-5645` (`@_admit_api_agent_request` at 5326, `def` at 5327).

**What it is:** an implementation of OpenAI's *Responses API*. Unlike `/v1/chat/completions` (stateless; history comes from the request or a header-selected session), `/v1/responses` is **server-stateful**: each turn is persisted in a dedicated SQLite LRU store (`ResponseStore`, `api_server.py:822-978`, file `<HERMES_HOME>/response_store.db`, max **100** responses, `MAX_STORED_RESPONSES` line 153) keyed by a `resp_...` id, and the next turn chains to it with `previous_response_id` or a named `conversation`.

### Key differences vs `/v1/chat/completions`

| | `/v1/chat/completions` | `/v1/responses` |
|---|---|---|
| Input field | `messages[]` | `input` (string \| array of strings \| array of `{role, content}`) |
| System prompt | `role: "system"` messages | `instructions` (string) |
| History source | request body, or `X-Hermes-Session-Id` → state.db | `conversation_history` (body) > `previous_response_id` > `conversation` name |
| State store | `state.db` (SessionDB) | `response_store.db` (`ResponseStore`, 100-entry LRU) |
| Session id | derived by hash or supplied via header | `uuid4()` per new chain; reused from the stored response when chaining |
| Output | `choices[].message` | `output[]` of typed items (`function_call`, `function_call_output`, `message`) |
| Stream sentinel | `data: [DONE]` | **no `[DONE]`** — terminates with a named `response.completed` / `response.failed` event |
| Retrieval | none | `GET /v1/responses/{id}`, `DELETE /v1/responses/{id}` |

### Request body

| Field | Type | Notes | Citation |
|---|---|---|---|
| `input` | **required**. string, or array of strings, or array of `{role, content}` (content may be multimodal parts) | `null` → 400 `Missing 'input' field`. Wrong type → 400 `'input' must be a string or array`. | 5348-5382 |
| `instructions` | string | Ephemeral system prompt. Inherited from the previous response when omitted while chaining. | 5352, 5418-5419 |
| `previous_response_id` | string | Chains; unknown id → **404**. Mutually exclusive with `conversation`. | 5353, 5357-5359, 5410-5419 |
| `conversation` | string | Named conversation; resolved to the latest stored `response_id`. Unknown name is NOT an error (starts a new chain). | 5354, 5361-5364 |
| `conversation_history` | array of `{role, content}` | Explicit history, **takes precedence over `previous_response_id`**. Each entry must have both keys or 400. | 5386-5408 |
| `store` | bool-ish, default **true** | `false` → the response is not persisted (so `GET /v1/responses/{id}` will 404). | 5355 |
| `truncation` | `"auto"` | Applies `_auto_truncate_response_history` (keeps ≤100 history messages, `RESPONSES_AUTO_TRUNCATION_HISTORY_LIMIT` line 158). | 5430-5432 |
| `stream` | bool-ish, default false | See SSE below. | 5438 |
| `model`, `provider`, `model_options` | same semantics as chat/completions (bare `model` gated by `direct_model_requests`; `allow_bare_model` at 5443) | | 5439-5451 |
| `tools` | only used in the idempotency fingerprint | | 5546-5552 |

Headers: `X-Hermes-Session-Key` (5334-5337) and `Idempotency-Key` (5546) are honored. **`X-Hermes-Session-Id` is NOT read on this route.**

**Real request body** (verbatim from `tests/gateway/test_api_server_multimodal.py:131-149`):
```json
{
  "model": "hermes-agent",
  "input": [
    {
      "role": "user",
      "content": [
        {"type": "input_text", "text": "Describe."},
        {"type": "input_image", "image_url": "https://example.com/cat.png"}
      ]
    }
  ]
}
```

### Non-streaming response body (verbatim shape, `api_server.py:5615-5627` + `_extract_output_items` 6185-6246)

```json
{
  "id": "resp_1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
  "object": "response",
  "status": "completed",
  "created_at": 1755631234,
  "model": "hermes-agent",
  "output": [
    {
      "id": "fc_9f8e7d6c5b4a39281706f5e4",
      "type": "function_call",
      "status": "completed",
      "name": "calculator",
      "arguments": "{\"expression\": \"6*7\"}",
      "call_id": "call_abc123"
    },
    {
      "id": "fco_1122334455667788990aabbc",
      "type": "function_call_output",
      "status": "completed",
      "call_id": "call_abc123",
      "output": "42"
    },
    {
      "type": "message",
      "role": "assistant",
      "content": [{"type": "output_text", "text": "42"}]
    }
  ],
  "usage": {"input_tokens": 12, "output_tokens": 4, "total_tokens": 16}
}
```
- `id` = `"resp_" + uuid4().hex[:28]` (5583 on the non-streaming path; 5514 on the streaming path).
- Header `X-Hermes-Session-Id: <effective session id>` (+ `X-Hermes-Session-Key` when supplied) — 5642-5645.
- Shape asserted by `tests/gateway/test_api_server.py:1986-2043` (`output[0]["type"] == "function_call"`, `output[1]["type"] == "function_call_output"`, both `status == "completed"`).

### Streaming SSE for `/v1/responses` (`_write_sse_responses`, `api_server.py:4719-5324`)

**CORRECTED (was wrong in an earlier draft):** this route does **NOT** use `ensure_ascii=False`. Line 4808 is `await response.write(_sse_frame(data, event=event_type))` — no `ensure_ascii` argument, so `_sse_frame`'s default `ensure_ascii=True` applies and non-ASCII is `\uXXXX`-escaped, exactly like `/v1/chat/completions`. The **only** `ensure_ascii=False` call site in the whole file is `api_server.py:4084` (the `/api/sessions/{id}/chat/stream` writer) — verified by `grep -n "ensure_ascii=False" api_server.py`, which returns only 4084 plus two docstring lines (196, 202).

Every event is a **named** SSE event whose `data` also repeats the name in a `type` field and carries a monotonically increasing `sequence_number` (`_write_event`, 4803-4808).

Complete list of emitted event names and payloads:

| Event | Payload keys | Citation |
|---|---|---|
| `response.created` | `type`, `response` (envelope, `status:"in_progress"`, `output: []`), `sequence_number` | 4883-4887 |
| `response.output_item.added` (message) | `type`, `output_index`, `item` = `{id:"msg_…", type:"message", status:"in_progress", role:"assistant", content: []}` | 4906-4911 |
| `response.output_text.delta` | `type`, `item_id`, `output_index`, `content_index: 0`, `delta`, `logprobs: []` | 4915-4922 |
| `response.output_item.added` (function_call) | `type`, `output_index`, `item` = `{id:"fc_…", type:"function_call", status:"in_progress", name, call_id, arguments:"<json string>"}` | 4963-4967 |
| `response.output_item.done` (function_call) | `type`, `output_index`, `item` = same with `status:"completed"` | 4996-5000 |
| `response.output_item.added` (function_call_output) | `type`, `output_index`, `item` = `{id:"fco_…", type:"function_call_output", call_id, output:[{"type":"input_text","text":"<result>"}], status:"completed"}` | 5019-5023 |
| `response.output_item.done` (function_call_output) | same item | 5024-5028 |
| `response.output_text.done` | `type`, `item_id`, `output_index`, `content_index: 0`, `text`, `logprobs: []` | 5142-5149 |
| `response.output_item.done` (message) | `type`, `output_index`, `item` = `{id, type:"message", status:"completed", role:"assistant", content:[{"type":"output_text","text": …}]}` | 5159-5163 |
| `response.completed` | `type`, `response` (full envelope, `status:"completed"`, `output`, `usage`) | 5253-5256 |
| `response.failed` | `type`, `response` (envelope, `status:"failed"`, `output`, `usage`, `error:{message,type:"server_error"}`) | 5224-5227 and 5316-5319 |

Literal example of the first frame on the wire:
```
event: response.created
data: {"type": "response.created", "response": {"id": "resp_...", "object": "response", "status": "in_progress", "created_at": 1755631234, "model": "hermes-agent", "output": []}, "sequence_number": 0}

```
Text deltas are **batched on a 50 ms timer** before being flushed (5054-5058, `_batch_flush_after(0.05)`), and any tool event flushes the buffer first (5045-5049).

**There is NO `data: [DONE]` on this route** — grep for `DONE` in `api_server.py` returns only lines 4681 and 4713, both inside `_write_sse_chat_completion`. Clients must treat `response.completed` / `response.failed` as terminal.

Abnormal termination: on client disconnect or server cancellation an `incomplete` snapshot is persisted (status `"incomplete"`) so `GET /v1/responses/{id}` and chaining keep working (4844-4874, 5257-5290). Asserted by `tests/gateway/test_api_server.py:1651-1784`.

### `GET /v1/responses/{response_id}`

`api_server.py:5651-5662` (404 at 5660, `return web.json_response(stored["response"])` at 5662). Auth-checked, then returns **exactly** `stored["response"]` — i.e. the same envelope object shown above (`{"id","object":"response","status","created_at","model","output","usage"}`), with no wrapper. Missing id → 404:
```json
{"error": {"message": "Response not found: resp_xyz", "type": "invalid_request_error", "param": null, "code": null}}
```

### `DELETE /v1/responses/{response_id}`

`api_server.py:5664-5681`. 404 with the same envelope if unknown; otherwise:
```json
{"id": "resp_1a2b3c4d5e6f7a8b9c0d1e2f3a4b", "object": "response", "deleted": true}
```

---

## A.3 How conversation scope is selected on the `/v1/*` routes — exact enumeration

**Headers, not body fields, carry session identity on `/v1/chat/completions`.**

| Route | Body field | Header | Precedence |
|---|---|---|---|
| `/v1/chat/completions` | *(none — no `session_id` field is read)* | `X-Hermes-Session-Id` (transcript scope), `X-Hermes-Session-Key` (memory scope) | 1. `X-Hermes-Session-Id` if present → history from `state.db`, request-body history ignored (4238-4276). 2. Otherwise `session_id = "api-" + sha256(system_prompt + "\n" + first_user_message)[:16]` (4277-4288 → 1265-1282). |
| `/v1/responses` | `previous_response_id`, `conversation`, `conversation_history` | `X-Hermes-Session-Key` only | 1. `conversation_history` (body) 2. `previous_response_id` 3. `conversation` name → stored response id. Session id = the stored chain's `session_id`, else a fresh `uuid4()` (5436). `X-Hermes-Session-Id` is **not** read (5327-5645). |
| `/api/sessions/{id}/chat[/stream]` | *(id is in the URL path)* | `X-Hermes-Session-Key` only | Path param is the transcript scope; `X-Hermes-Session-Id` is not read here (3842-3856, 3725-3739). |
| `/v1/runs` | `session_id` (body field) | `X-Hermes-Session-Key` | `body["session_id"]` → stored chain id → `run_id` fallback (6747, 6760). |

Both headers echo back on the response (`X-Hermes-Session-Id`, `X-Hermes-Session-Key`) — 4462-4466 (chat/completions), 5642-5645 (`/v1/responses`), 3810-3812 (session chat), 4064-4071 (session chat stream).

Header validation rules (`api_server.py:2120-2170` and 4238-4276):
- Either header **without a configured API key** → **403** `{"error":{"message":"… requires API key authentication. Configure API_SERVER_KEY to enable this feature.", …}}`.
- Contains `\r`, `\n`, or `\x00` → **400** `Invalid session key` / `Invalid session ID`.
- Longer than **256** chars (`_MAX_SESSION_HEADER_LEN`, line 2118) → **400** `Session key too long` / `Session ID too long`.
- `X-Hermes-Session-Id` additionally rejects path-traversal shapes via `gateway.session._is_path_unsafe` → 400 (verified by `tests/gateway/test_api_server.py:2316-2329`).

Real session-key value used in tests (shows the intended format): `"agent:main:webui:dm:user-7"` (`tests/gateway/test_api_server.py:2404`) and `"webui:chan-1"` (line 2424).

---

# B) Sessions CRUD (`/api/sessions*`)

All of these persist to **`<HERMES_HOME>/state.db`** through `hermes_state.SessionDB` (`api_server.py:2193`: `SessionDB(db_path=home / "state.db")`). On this machine `HERMES_HOME` = `C:\Users\<usuario>\AppData\Local\hermes` (`hermes_constants.py:53-59`, Windows branch → `%LOCALAPPDATA%\hermes`; the directory contains `state.db`). **This is the same DB the Hermes Desktop sidebar reads** — see section C.

All handlers call `_check_auth` first, and any of them can return **503** `session_db_unavailable` if the DB cannot be opened.

## B.1 `GET /api/sessions`

Handler `api_server.py:3392-3425`.

**Query params (this is the complete list — there is no `search`/`q` param):**

| Param | Type | Default | Max | Citation |
|---|---|---|---|---|
| `limit` | non-negative int | `50` | clamped to `200` | 3402, 3320-3327 |
| `offset` | non-negative int | `0` | clamped to `1_000_000` | 3403 |
| `source` | string | none (no filter) | — | 3404 |
| `include_children` | bool-ish (`1/true/yes/on`) | `false` | — | 3405 |

Non-integer / negative `limit`/`offset` silently fall back to the default (they do **not** 400) — `_parse_nonnegative_int`, 3320-3327.

Server-side behavior baked in (3406-3417): `order_by_last_active=True`, `include_pinned=True` (pinned rows are back-filled *past* the limit), archived rows excluded, hidden rows excluded, sub-agent/compression children excluded unless `include_children=1`.

**Response body (verbatim shape from 3419-3425):**
```json
{
  "object": "list",
  "data": [ /* array of session objects, see B.2 */ ],
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```
`has_more` counts **only non-pinned rows** against `limit` (`windowed = sum(1 for s in sessions if not s.get("pinned"))` at 3418; used at 3424) — back-filled pins must not be mistaken for another page.

## B.2 The session object — EVERY field

Produced by `_session_response` (`api_server.py:3330-3349`). Keys are emitted **only when present on the DB row** (`if key in session`), so a client must treat every one as optional. The `safe_keys` tuple, verbatim (source lines 3332-3339):

```
id, source, user_id, model, title, started_at, ended_at, end_reason,
message_count, tool_call_count, input_tokens, output_tokens,
cache_read_tokens, cache_write_tokens, reasoning_tokens,
estimated_cost_usd, actual_cost_usd, api_call_count,
parent_session_id, last_active, preview, _lineage_root_id,
pinned, archived, hidden
```
Plus two always-present derived booleans (3347-3348):
- `has_system_prompt` — `bool(session["system_prompt"])`
- `has_model_config` — `bool(session["model_config"])`

`pinned` / `archived` / `hidden` are coerced from SQLite `0/1` to real JSON booleans (3341-3344). **`system_prompt` and `model_config` themselves are never exposed.**

| Field | Type | Meaning | Citation |
|---|---|---|---|
| `id` | string | Session id (primary key in `sessions`) | 3331 |
| `source` | string | Origin platform, e.g. `api_server`, `cli`, `desktop`, `telegram` | 3333, 2567-2573 |
| `user_id` | string \| null | Platform user id | 3331 |
| `model` | string \| null | Model persisted on the row. **`null` when the client sent no model or sent the virtual alias** (`hermes-agent`) — guarded by `tests/gateway/test_api_server.py:2649-2733` (four `..._does_not_persist_virtual_alias` / `..._persists_it` tests) | 3333 |
| `title` | string \| null | Max 100 chars, globally unique across sessions | `hermes_state.py:7961`, `8140` |
| `started_at` | float (epoch seconds) | Creation time | 3331 |
| `ended_at` | float \| null | Set by `end_session` | 3331 |
| `end_reason` | string \| null | e.g. `"branched"` after a fork | 3331, 3707 |
| `message_count` | int | Persisted message count | 3332 |
| `tool_call_count` | int | | 3332 |
| `input_tokens` / `output_tokens` | int | | 3332 |
| `cache_read_tokens` / `cache_write_tokens` | int | | 3333 |
| `reasoning_tokens` | int | | 3334 |
| `estimated_cost_usd` / `actual_cost_usd` | float | `hermes_state_schema.py:767` (`REAL NOT NULL DEFAULT 0`) | 3334 |
| `api_call_count` | int | | 3335 |
| `parent_session_id` | string \| null | Set on forks and compression children | 3335 |
| `last_active` | float | freshest of heartbeat and latest-message timestamp, else `started_at` | `hermes_state.py:8670-8672` |
| `preview` | string | first ~60 chars of the first user message | `hermes_state.py:8669-8672` |
| `_lineage_root_id` | string | compression-chain root id (leading underscore is intentional) | 3336 |
| `pinned` / `archived` / `hidden` | bool | durable flags | 3336, 3341-3344 |
| `has_system_prompt` | bool | derived | 3346 |
| `has_model_config` | bool | derived | 3347 |

**Note:** there is **no `updated_at`** and **no `provider`** field on this endpoint. "Last update" is `last_active`. The provider lives inside `model_config.browser_model_lock` (not exposed) or in the `runtime` block returned by the chat endpoints.

## B.3 `POST /api/sessions`

Handler `api_server.py:3427-3546`.

**Request body (all optional):**

| Field | Type | Notes | Citation |
|---|---|---|---|
| `id` or `session_id` | string | If omitted: `f"api_{int(time.time())}_{uuid4().hex[:8]}"`. Rejected (400 `invalid_session_id`) if empty, contains `\r\n\x00`, is path-unsafe, or >256 chars. | 3444-3452 |
| `title` | string | Sanitized (control chars stripped, whitespace collapsed, ≤100 chars). Duplicate title → **400** `invalid_title` and the just-inserted row is rolled back. | 3480, 3497-3513, `hermes_state.py:7991-8003` |
| `system_prompt` | string | Non-string → 400 `invalid_system_prompt`. | 3454-3456 |
| `source` | string | Normalized by `_normalize_session_source`; allowed set: `api_server, hermes_browser, browser, cli, telegram, discord, slack, desktop, dashboard`. `browser` → `hermes_browser`. **Anything else silently becomes `api_server`.** Default `api_server`. | 3458, 2567-2573 |
| `model` / `model_id` | string | Supports the `provider::model` prefix form. The virtual alias (`hermes-agent`, bare or provider-prefixed) is nulled out and NOT persisted. | 3459-3475, 2380-2417 |
| `provider` / `provider_id` | string | | 2381 |
| `model_options` | object | Persisted inside `model_config.browser_model_lock.model_options`. | 3471 |
| `require_model_lock` | bool | Marks the persisted lock `confirmed`. If it cannot be routed → **409** `model_lock_unavailable`; if no model/provider given → **400** `missing_model`. | 3461-3464, 2419-2436 |

**Minimal request:** `{}` → 201 with a generated id and `"model": null` (test `test_create_session_without_model_does_not_persist_virtual_alias`, `tests/gateway/test_api_server.py:2649` — the earlier citation `2586-2610` was wrong; that range is `TestSessionModelRouting` / `_create_agent` tests).

**Example request:**
```json
{"id": "raycast-2026-08-19-abc123", "title": "Raycast quick ask", "source": "desktop", "model": "openai/gpt-5"}
```

**Response — HTTP 201** (verbatim from 3546):
```json
{
  "object": "hermes.session",
  "session": {
    "id": "raycast-2026-08-19-abc123",
    "source": "desktop",
    "model": "openai/gpt-5",
    "title": "Raycast quick ask",
    "started_at": 1755631234.567,
    "message_count": 0,
    "pinned": false,
    "archived": false,
    "hidden": false,
    "has_system_prompt": false,
    "has_model_config": true
  }
}
```
(The exact key set follows B.2 — only columns present on the freshly inserted row appear.)

**409 on duplicate id** (3543):
```json
{"error": {"message": "Session already exists: raycast-2026-08-19-abc123", "type": "invalid_request_error", "param": null, "code": "session_exists"}}
```
The existence check + insert + title write run inside a single `db._execute_write(_atomic)` transaction (`_do_create` / `_atomic`, `api_server.py:3495-3539`), and `SessionDB._execute_write` is documented as *"Execute a write transaction with BEGIN IMMEDIATE and jitter retry"* (`hermes_state.py:3967`, docstring at 3972) — so concurrent creates of the same id serialize.

## B.4 `GET /api/sessions/{session_id}`

`api_server.py:3548-3556`.
```json
{"object": "hermes.session", "session": { /* B.2 fields */ }}
```
404:
```json
{"error": {"message": "Session not found: nope", "type": "invalid_request_error", "param": null, "code": "session_not_found"}}
```

## B.5 `PATCH /api/sessions/{session_id}`

`api_server.py:3558-3603`.

**Patchable fields — exactly these six** (3575):
```python
allowed = {"title", "end_reason", "pinned", "archived", "hidden", "unread"}
```
The set literal contains six names.

| Field | Type | Effect | Citation |
|---|---|---|---|
| `title` | string \| null | `null` → clears the title. Duplicate/invalid → **400** `invalid_title`. | 3587-3591 |
| `pinned` | bool | `SessionDB.set_session_pinned` — the durable "keep" flag that exempts the chat from the auto-archive sweep. | 3592-3593 |
| `archived` | bool | `set_session_archived` | 3594-3595 |
| `hidden` | bool | `set_session_hidden` | 3596-3597 |
| `unread` | bool | `set_session_read(read = not unread)` — the read-state watermark | 3598-3599 |
| `end_reason` | truthy string | `end_session(session_id, str(value))` — **terminates the session**. Only applied when truthy. | 3600-3601 |

**`model` is NOT patchable here** — use `POST /api/sessions/{id}/model` (B.9) or pass `model` on a chat call.

Any unknown key → **400**:
```json
{"error": {"message": "Unsupported session fields: foo, model", "type": "invalid_request_error", "param": null, "code": "unsupported_session_field"}}
```
Non-boolean value for a flag → **400**:
```json
{"error": {"message": "'pinned' must be a boolean", "type": "invalid_request_error", "param": null, "code": "invalid_session_field"}}
```
Success → 200 with the refreshed session:
```json
{"object": "hermes.session", "session": { /* B.2 fields */ }}
```

## B.6 `DELETE /api/sessions/{session_id}`

`api_server.py:3605-3616`. 404 first if unknown, else:
```json
{"object": "hermes.session.deleted", "id": "raycast-2026-08-19-abc123", "deleted": true}
```
Note: the source emits `"deleted": bool(deleted)` where `deleted = db.delete_session(session_id)` (3615-3616) — so a 200 with `"deleted": false` is possible (row vanished between the 404 check and the delete). Do not assume `true`.

## B.7 `GET /api/sessions/{session_id}/messages`

`api_server.py:3618-3675`.

The path id is first resolved forward through compression continuations via `SessionDB.resolve_resume_session_id` (3628, `hermes_state.py:10373`) — **the `session_id` in the response may differ from the one you requested**.

**Query params:**

| Param | Type | Default | Notes | Citation |
|---|---|---|---|---|
| `limit` | int ≥ 0 | `500` when omitted | clamped to `min(limit, 500)` | 3629, 3642, 3657 |
| `offset` | int ≥ 0 | `0` | | 3630, 3641 |
| `order` | `"oldest"` \| `"latest"` | `"latest"` when `limit` is omitted, otherwise `"oldest"` | any other value → 400 `invalid_pagination` | 3631-3639, 3655-3656 |

Non-integer or negative values → **400**:
```json
{"error": {"message": "limit and offset must be non-negative integers", "type": "invalid_request_error", "param": null, "code": "invalid_pagination"}}
```
```json
{"error": {"message": "order must be one of: oldest, latest", "type": "invalid_request_error", "param": null, "code": "invalid_pagination"}}
```

**Paging semantics with `order=latest`:** the offset is measured **back from the newest** message and the selected page is still returned in chronological order (`hermes_state.py:10169-10171`). So after hydrating the newest N rows, `offset=N&order=latest` returns the page immediately preceding it — the exact idiom the desktop uses (`apps/desktop/src/hermes.ts:869-885`).

**Important gap vs the desktop:** this endpoint calls `db.get_messages(resolved_id, limit=…, offset=…, latest=…)` and **never passes `include_compacted`** (3658-3664). The desktop's dashboard client does pass it (`apps/desktop/src/hermes.ts:820`: `query.set('include_compacted', String(page.includeCompacted))`). Consequence: on a session that underwent **in-place** context compaction, this endpoint's transcript ends at the compaction boundary and earlier rows are unreachable. There is no query param to change that here.

**Response body (verbatim shape from 3665-3675):**
```json
{
  "object": "list",
  "session_id": "raycast-2026-08-19-abc123",
  "data": [
    {
      "id": 4213,
      "session_id": "raycast-2026-08-19-abc123",
      "role": "user",
      "content": "list the files here",
      "tool_call_id": null,
      "tool_calls": null,
      "tool_name": null,
      "timestamp": 1755631234.5,
      "token_count": 7,
      "finish_reason": null,
      "reasoning": null,
      "reasoning_content": null
    },
    {
      "id": 4214,
      "session_id": "raycast-2026-08-19-abc123",
      "role": "assistant",
      "content": "",
      "tool_call_id": null,
      "tool_calls": [
        {"id": "call_abc123", "type": "function", "function": {"name": "terminal", "arguments": "{\"command\": \"ls -la\"}"}}
      ],
      "tool_name": null,
      "timestamp": 1755631235.1,
      "token_count": 21,
      "finish_reason": "tool_calls",
      "reasoning": null,
      "reasoning_content": null
    },
    {
      "id": 4215,
      "session_id": "raycast-2026-08-19-abc123",
      "role": "tool",
      "content": "total 12\ndrwxr-xr-x ...",
      "tool_call_id": "call_abc123",
      "tool_calls": null,
      "tool_name": "terminal",
      "timestamp": 1755631236.0,
      "token_count": 40,
      "finish_reason": null,
      "reasoning": null,
      "reasoning_content": null
    }
  ],
  "pagination": {"limit": 500, "offset": 0, "order": "latest", "returned": 3}
}
```

**Message object — EVERY field** (`_message_response`, `api_server.py:3352-3359`, keys emitted only when present on the row):

| Field | Type | Notes |
|---|---|---|
| `id` | int | SQLite AUTOINCREMENT rowid; **true insertion order** (ordering is by `id`, not timestamp — `hermes_state.py:10163-10164`) |
| `session_id` | string | |
| `role` | `"user"` \| `"assistant"` \| `"tool"` \| `"system"` | |
| `content` | string (decoded) | multimodal content is stored/returned in its encoded form; decoded by `_decode_content` (`hermes_state.py:10254-10256`) |
| `tool_call_id` | string \| null | on `role: "tool"` rows |
| `tool_calls` | array \| null | **already JSON-parsed** into a list of OpenAI tool-call objects (`hermes_state.py:10257-10263`) |
| `tool_name` | string \| null | |
| `timestamp` | float (epoch seconds) | |
| `token_count` | int \| null | |
| `finish_reason` | string \| null | |
| `reasoning` | string \| null | |
| `reasoning_content` | string \| null | |

**There is no `attachments` field.** Attachments/media arrive inline in `content` (image parts, or `hermes://media/...` tags resolved to data URLs on the chat responses via `_resolve_media_to_data_urls`, `api_server.py:1032-1081`, images ≤5 MB).

## B.8 `POST /api/sessions/{session_id}/fork`

`api_server.py:3677-3723`.

**Request body (all optional):**
```json
{"id": "raycast-fork-1", "title": "Alternate take"}
```
- `id` / `session_id` — new session id; default `api_{epoch}_{uuid8}` (3690). Rejects empty or `\r\n\x00` → 400 `invalid_session_id` (3691-3692). Existing id → **409** `session_exists` (3693-3694). Note: unlike `POST /api/sessions`, the fork path does **not** apply `_is_path_unsafe` or the 256-char length check.
- `title` — when omitted, derived via `SessionDB.get_next_title_in_lineage(<source title or "fork">)`, falling back to `"<base> fork"`.

Semantics (3700-3712): the **source session is ended with `end_reason: "branched"`**, then a child session is created with `parent_session_id = <source id>`, `source = "api_server"` (hardcoded — note this ignores the parent's source), carrying the parent's `model` and `system_prompt`, and the full message list is copied via `replace_messages`.

**Response — HTTP 201:**
```json
{"object": "hermes.session", "session": {"id": "raycast-fork-1", "source": "api_server", "parent_session_id": "raycast-2026-08-19-abc123", "title": "Alternate take", "...": "B.2 fields"}}
```

## B.9 `POST /api/sessions/{session_id}/chat` — non-streaming turn

`api_server.py:3724-3840` (`@_admit_api_agent_request` at 3724).

**Request body:**

| Field | Type | Notes | Citation |
|---|---|---|---|
| `message` **or** `input` | string or multimodal part array — **required** | Empty/invisible payload → 400 `missing_message`. Normalized by `_normalize_multimodal_content` (same rules as A.1). | 3739-3741, 798-810 |
| `system_message` **or** `instructions` | string | Ephemeral system prompt for this turn. Non-string → 400 `invalid_system_message`. | 3742-3744 |
| `model` / `model_id` | string | `provider::model` prefix supported. Bare `model` **is always honored** here (Hermes-native route; `direct_model_requests` does not gate it). | 3785, 372-411 |
| `provider` / `provider_id` | string | | 2381 |
| `model_options` | object | reasoning / service_tier / fast | 2359-2378 |
| `require_model_lock` | bool | 409 `model_lock_unavailable` if unroutable | 3757-3759 |

Header `X-Hermes-Session-Key` honored (3727-3729); `X-Hermes-Session-Id` is **not** read (the path id wins).

Model precedence for the turn (3745-3800 + `_create_agent` 2775-2840):
`confirmed session model lock` → `session /model override` (set from the CLI/gateway) → `session-persisted row model` → `model_routes` alias / per-request `model`+`provider` → global default.

**Example request:**
```json
{"message": "Summarise the last commit", "model": "anthropic/claude-opus-4.6", "provider": "anthropic"}
```

**Response — HTTP 200 (verbatim shape from `api_server.py:3830-3838`):**
```json
{
  "object": "hermes.session.chat.completion",
  "session_id": "raycast-2026-08-19-abc123",
  "message": {"role": "assistant", "content": "The last commit …"},
  "usage": {"input_tokens": 812, "output_tokens": 96, "total_tokens": 908},
  "runtime": {
    "provider": "anthropic",
    "model": "anthropic/claude-opus-4.6",
    "route_source": "raw_request",
    "requested": {"provider": "anthropic", "model": "anthropic/claude-opus-4.6"},
    "model_lock": ""
  }
}
```
- `session_id` is the **effective** id — it changes if context compression rotated the session mid-turn (3801-3802, `_run_agent` 6415-6421).
- `usage` is `{input_tokens, output_tokens, total_tokens}` (note: **not** the OpenAI `prompt_tokens/completion_tokens` naming used by `/v1/chat/completions`) — 6415-6420.
- `runtime` is produced by `_sanitize_runtime_metadata` (2538-2565): always `provider`, `model`, `route_source`; `requested` present only when a runtime was requested; `model_lock` present only when a lock is accepted/confirmed (3813-3828). `route_source` ∈ `global` \| `model_routes` \| `raw_request` \| `session_model_lock` \| `session_model_override` — all five confirmed as source literals: `route_source = "model_routes" if route else "global"` (2399), `"raw_request"` (2404, 2407), `"session_model_lock"` (2517, 2975), `"session_model_override"` (2977); `_sanitize_runtime_metadata` falls back to `"global"` (2554-2555).
- Headers: `X-Hermes-Session-Id`, and `X-Hermes-Session-Key` when supplied (3810-3812).

## B.10 `POST /api/sessions/{session_id}/chat/stream` — **THE CRITICAL ROUTE**

Handler `api_server.py:3841-4098` (`@_admit_api_agent_request` at 3841).

Request body and headers are **identical** to B.9 (same parsing code path, 3844-3902).

### Wire format

Response headers (4064-4071):
```
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no
X-Hermes-Session-Id: <the path session id>
X-Hermes-Session-Key: <key>          (only when supplied)
```
HTTP status **200**.

This is **SSE with named events**. Every frame is written by `_sse_frame(payload, event=name, ensure_ascii=False)` at `api_server.py:4084`:
```
event: <name>
data: {"...": "json, raw UTF-8"}

```
There is **no `[DONE]` sentinel** on this route (grep confirms `DONE` appears only at 4681/4713 in the chat-completions writer). Termination is signalled by the `done` event.

**Keepalive:** if no event is produced within 30 s (`CHAT_COMPLETIONS_SSE_KEEPALIVE_SECONDS`, line 155) the server writes a bare SSE comment (4077-4080):
```
: keepalive

```

**Every event payload automatically carries four envelope keys** (`_event_payload`, `api_server.py:3922-3929`), injected with `setdefault` so an explicit value wins:
```python
payload.setdefault("session_id", session_id)   # the path session id
payload.setdefault("run_id", run_id)           # f"run_{uuid4().hex}"
payload.setdefault("seq", seq)                 # 1-based, monotonic per stream
payload.setdefault("ts", time.time())          # float epoch seconds
```

### Complete event catalogue

| # | Event name | Emitted at | Payload (beyond `session_id`/`run_id`/`seq`/`ts`) |
|---|---|---|---|
| 1 | `run.started` | 3958-3961 | `user_message`: `{"role":"user","content": <normalized user content>}`, `runtime`: sanitized runtime metadata |
| 2 | `message.started` | 3963 | `message`: `{"id": "msg_<uuid4hex>", "role": "assistant"}` |
| 3 | `assistant.delta` | 3946-3948 | `message_id`, `delta` (string chunk). Empty deltas are suppressed. |
| 4 | `tool.progress` | 3949-3951 | `message_id`, `tool_name` (defaults `"_thinking"`), `delta` (the reasoning preview, ≤500 chars). **Only emitted for the agent's `reasoning.available` progress event.** |
| 5 | `tool.started` | 3952-3954 | `message_id`, `tool_name`, `preview`, `args` |
| 6 | `tool.completed` | 3952-3954 | `message_id`, `tool_name`, `preview` (**null** — the agent passes `None` on completion), `args` (**null**) |
| 7 | `tool.failed` | 3952-3954 | same shape. **Never emitted (re-confirmed):** the mapper accepts `"tool.failed"` (3952) but no producer exists — `agent/tool_executor.py` emits only `"tool.started"` (1006), `"tool.completed"` (1807), `"tool.output_risk"` (1845), and a repo-wide grep for `"tool.failed"` returns only `api_server.py:3952`. Treat as reserved. |
| 8 | `assistant.completed` | 4001-4012 | `session_id` (**effective**, may differ), `message_id`, `content` (full final text, media resolved to data URLs), `completed: true`, `partial: false`, `interrupted: false`, `runtime` |
| 9 | `run.completed` | 4014-4025 (`completed_payload` built then enqueued at 4025) | `session_id` (effective), `message_id`, `completed: true`, `messages` (this turn's assistant+tool transcript, each in the B.7 message shape), `usage`, `runtime`, and `pending_steer` only when a steer arrived after the final response |
| 10 | `error` | 4045 | `message` (redacted error text). Emitted instead of 8/9 when the turn raises. |
| 11 | `done` | 4048 | `{}` (plus the four envelope keys). **Always the final event**, emitted in a `finally` block. |

Source of the event-name strings (`_delta` / `_tool_progress` closures, `api_server.py:3945-3954`):
```python
def _delta(delta: str) -> None:
    if delta:
        _enqueue("assistant.delta", {"message_id": message_id, "delta": delta})

def _tool_progress(event_type, tool_name=None, preview=None, args=None, **kwargs) -> None:
    if event_type == "reasoning.available":
        _enqueue("tool.progress", {"message_id": message_id, "tool_name": tool_name or "_thinking", "delta": preview or ""})
    elif event_type in {"tool.started", "tool.completed", "tool.failed"}:
        event_name = event_type.replace("tool.", "tool.")
        _enqueue(event_name, {"message_id": message_id, "tool_name": tool_name, "preview": preview, "args": args})
```

### Literal example stream

```
event: run.started
data: {"user_message": {"role": "user", "content": "list files"}, "runtime": {"provider": "", "model": "", "route_source": "global"}, "session_id": "raycast-abc", "run_id": "run_2f0c...", "seq": 1, "ts": 1755631234.11}

event: message.started
data: {"message": {"id": "msg_9a7b...", "role": "assistant"}, "session_id": "raycast-abc", "run_id": "run_2f0c...", "seq": 2, "ts": 1755631234.12}

event: tool.started
data: {"message_id": "msg_9a7b...", "tool_name": "terminal", "preview": "terminal(ls -la)", "args": {"command": "ls -la"}, "session_id": "raycast-abc", "run_id": "run_2f0c...", "seq": 3, "ts": 1755631234.30}

event: tool.completed
data: {"message_id": "msg_9a7b...", "tool_name": "terminal", "preview": null, "args": null, "session_id": "raycast-abc", "run_id": "run_2f0c...", "seq": 4, "ts": 1755631235.02}

event: assistant.delta
data: {"message_id": "msg_9a7b...", "delta": "Here are ", "session_id": "raycast-abc", "run_id": "run_2f0c...", "seq": 5, "ts": 1755631235.20}

event: assistant.delta
data: {"message_id": "msg_9a7b...", "delta": "the files.", "session_id": "raycast-abc", "run_id": "run_2f0c...", "seq": 6, "ts": 1755631235.24}

: keepalive

event: assistant.completed
data: {"session_id": "raycast-abc", "message_id": "msg_9a7b...", "content": "Here are the files.", "completed": true, "partial": false, "interrupted": false, "runtime": {"provider": "anthropic", "model": "anthropic/claude-opus-4.6", "route_source": "global"}, "run_id": "run_2f0c...", "seq": 7, "ts": 1755631235.30}

event: run.completed
data: {"session_id": "raycast-abc", "message_id": "msg_9a7b...", "completed": true, "messages": [{"id": 4214, "session_id": "raycast-abc", "role": "assistant", "content": "", "tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "terminal", "arguments": "{\"command\": \"ls -la\"}"}}], "timestamp": 1755631235.0}, {"id": 4215, "session_id": "raycast-abc", "role": "tool", "content": "total 12", "tool_call_id": "call_1", "tool_name": "terminal", "timestamp": 1755631235.0}], "usage": {"input_tokens": 812, "output_tokens": 96, "total_tokens": 908}, "runtime": {"provider": "anthropic", "model": "anthropic/claude-opus-4.6", "route_source": "global"}, "run_id": "run_2f0c...", "seq": 8, "ts": 1755631235.31}

event: done
data: {"session_id": "raycast-abc", "run_id": "run_2f0c...", "seq": 9, "ts": 1755631235.32}

```
(field values are illustrative; the **key sets and event names** are exact per the cited lines.)

### Client guidance derived from source

- **Do not** rebuild the transcript purely from `assistant.delta`: intermediate assistant text segments that precede tool calls cannot be separated from a single delta buffer. Use `run.completed.messages`, which is the authoritative per-turn transcript (`_turn_transcript_messages` docstring, `api_server.py:6146-6167`).
- **Errors before the stream opens** are ordinary JSON responses with a non-200 status (404/400/409/401/503) — the client must check `response.ok`/content-type before treating the body as SSE (3846-3902).
- **Errors after the stream opens** arrive as `event: error`, then `event: done`; the HTTP status is already 200.
- **Aborting the fetch** interrupts the live agent run (`_drain_session_stream_task_on_disconnect`, 4100-4120) — this is the correct way to implement a "Stop" action in Raycast.
- The run is also addressable via `run_id` on `/v1/runs/{run_id}` for status, and `/v1/runs/{run_id}/stop|steer` — the stream registers status through `_set_run_status` (3915-3920, 3962, 4029-4043).

## B.11 `POST /api/sessions/{session_id}/model`

`api_server.py:4122-4163`. (**There is no PATCH variant.**)

Request body — same runtime fields as B.3/B.9; `require_model_lock` is forced to `true` server-side (`runtime_request["require_model_lock"] = True`, 4135):
```json
{"model": "anthropic/claude-opus-4.6", "provider": "anthropic", "model_options": {"reasoning": {"enabled": true, "effort": "high"}}}
```
Also accepts `model_id` / `provider_id` aliases and the `provider::model` prefix form (2380-2386).

Persistence: merges `browser_model_lock` into the session row's `model_config` JSON and sets the row's `model`, **nulling `system_prompt` / `system_prompt_hash`** so cached `Model:` footers can't lie (`hermes_state.py:7022-7062`). The stored lock object is:
```json
{"provider": "anthropic", "model": "anthropic/claude-opus-4.6", "model_options": {}, "route_source": "raw_request", "confirmed": true, "updated_at": 1755631234.5}
```

**Response — HTTP 200 (verbatim from 4159-4163):**
```json
{
  "object": "hermes.session.model_lock",
  "session_id": "raycast-2026-08-19-abc123",
  "runtime": {
    "provider": "anthropic",
    "model": "anthropic/claude-opus-4.6",
    "route_source": "raw_request",
    "requested": {"provider": "anthropic", "model": "anthropic/claude-opus-4.6"},
    "model_lock": "accepted"
  }
}
```
`model_lock` is `"accepted"` here; it becomes `"confirmed"` on a subsequent chat response once the agent's actual provider/model matched the lock (`_run_agent` 6470-6489 raises if they don't).

Errors: **400** `missing_model` (no model/provider), **409** `model_lock_unavailable` (cannot be routed — refuses a silent global fallback), **500** `model_lock_persistence_failed`.

---

# C) Session identity — session key vs session id vs conversation id

## C.1 The three concepts, precisely

| Concept | What it is | Where it lives | Citation |
|---|---|---|---|
| **session id** (`session_id`, `X-Hermes-Session-Id`) | The **short-term transcript scope**. One row in the `sessions` table of `state.db` and all its `messages` rows. Rotates when the user starts a new conversation, and *also* rotates automatically when context compression forks a continuation child. | `state.db` `sessions.id` | 2662-2665, `_run_agent` 6415-6421 |
| **session key** (`gateway_session_key`, `X-Hermes-Session-Key`) | The **stable per-channel identifier** that persists *across* transcripts. It scopes long-term memory providers (Honcho) and the gateway's per-session `/model` overrides and last-known-good model cache. Format is free-form, e.g. `agent:main:webui:dm:user-7`. Max 256 chars. | contextvar + memory provider; `_last_resolved_model` cache key | 2126-2131, 2665-2670, 1449-1455 |
| **conversation id** | Only exists on `/v1/responses`: the `conversation` **name** you pass, mapped in `response_store.db` to the latest `resp_…` id. It is *not* a session id, and it is *not* stored in `state.db`. | `<HERMES_HOME>/response_store.db` | 958-971, 5361-5364 |
| **run id** | Per-turn execution handle (`run_…`). Used for stop/steer/approval and for the **approval namespace**. Never a conversation scope. | in-memory `_run_statuses` | 6759-6767 |

## C.2 The line-6764 comment, explained

```python
# api_server.py:6760-6767
session_id = session_id or run_id
# Approval queues gate host-side tool execution and must be isolated
# per API run.  Client-provided session IDs and memory session keys are
# conversation/memory scopes, not authorization namespaces: multiple
# concurrent runs can intentionally share them, and resolving an
# approval for one run must not unblock another run's dangerous command.
approval_session_key = run_id
```

Meaning, precisely:
- `session_id` and `session_key` are **conversation/memory scopes** — they say *which transcript* and *which memory bucket* this turn belongs to. They are deliberately **shareable**: two clients (Raycast and Desktop) may legitimately drive the same `session_id` concurrently.
- They are **NOT authorization namespaces** — they grant nothing. All authorization on this server is the single `API_SERVER_KEY` bearer token (`_check_auth`, 1782). Anyone with the key can read/write any session id.
- Consequently, tool-approval prompts (the "may I run this dangerous command?" gate) are keyed on the **`run_id`**, never on the session, so approving a command in one run cannot unblock a different concurrent run that happens to share the session.

**Security implication for Raycast:** the `X-Hermes-Session-Id` and `X-Hermes-Session-Key` headers are gated behind having an API key configured (403 otherwise) precisely because they expose conversation history — but once you hold the key, *any* session id is readable (2136-2143, 4242-4253).

## C.3 How Hermes Desktop scopes sessions — traced

**Finding: Hermes Desktop does NOT use `api_server.py` at all.**

- `apps/desktop/src/hermes.ts` imports `JsonRpcGatewayClient` from `@hermes/shared` (line 1) and drives the agent over a **JSON-RPC WebSocket** method `prompt.submit` with `{session_id, text}` — `apps/desktop/src/app/contrib/hooks/use-session-tile-delegate.ts:171`.
- All its REST reads go through `hermesApi({path: '/api/sessions…'})` to the **dashboard FastAPI server**, not this aiohttp adapter. Proof: the shapes differ. Desktop expects `{sessions: [...], total, limit, offset}` (`hermes.ts:500-518`) and `{ok: true}` from PATCH/DELETE (`hermes.ts:741-772`), whereas `api_server.py` returns `{"object":"list","data":[…]}` (3419-3421) and `{"object":"hermes.session", …}` (3556). The desktop also calls routes that do not exist on this adapter: `/api/profiles/sessions`, `/api/sessions/search`, `/api/sessions/{id}/latest-descendant`, `?include_compacted=`.
- The dashboard implementation is `hermes_cli/web_routers/sessions.py` (`@list_router.get("/api/sessions")` at line 53).

**The bridge is the database, not the HTTP surface.** Both servers open the same file:
- `api_server.py:2193` → `SessionDB(db_path=home / "state.db")`, `home = get_hermes_home()`.
- `hermes_cli/web_routers/sessions.py:103` → `_open_session_db_for_profile(profile, read_only=True)` → `SessionDB` over the same profile home.
- On this machine: `C:\Users\<usuario>\AppData\Local\hermes\state.db` (`hermes_constants.py:53-59`, Windows → `%LOCALAPPDATA%\hermes`; the file exists in that directory).

## C.4 What Raycast must send for cross-visibility — the answer

**Short answer: use `POST /api/sessions` + `POST /api/sessions/{id}/chat/stream`, and set `"source": "desktop"` (or `"cli"`) at creation. Do NOT rely on `/v1/chat/completions` for shared sessions.**

Reasoning, each step traced:

1. **Use the `/api/sessions/*` family, not `/v1/chat/completions`.** Session rows created by the session API get a real, stable, client-chosen `id` (3447-3453) and are written to `state.db`. `/v1/chat/completions` without a header derives an opaque `api-<sha256[:16]>` id (1265-1281) that no human can predict or reuse.

2. **`min_messages=1` — an empty session is invisible.** The Desktop sidebar fetches with `minMessages = 1`: `listAllProfileSessions(req.recentsLimit, 1, 'exclude', 'recent', …)` (`apps/desktop/src/hermes.ts:651-656`), and the backend applies `s.message_count >= ?` (`list_sessions_rich`, parameter `min_message_count`, `hermes_state.py:8761-8763`). ⇒ **A session created by `POST /api/sessions` will not appear in Hermes Desktop until at least one message is persisted.** Create it and send the first turn before expecting it in the sidebar.

3. **`source` decides WHICH sidebar section — and `api_server` is excluded from Recents.**
   - Desktop recents exclude: `SIDEBAR_EXCLUDED_SOURCES = ['cron', 'kanban', 'subagent', 'tool', ...MESSAGING_SESSION_SOURCE_IDS]` (`apps/desktop/src/app/session/hooks/use-session-list-actions.ts:49`).
   - `MESSAGING_SESSION_SOURCE_IDS` (declared `session-source.ts:52-73`) **contains `'api_server'`** at `apps/desktop/src/lib/session-source.ts:66`.
   - ⇒ A default `source: "api_server"` session is **filtered out of Desktop's Recents** and instead appears in the **Messaging** section under the label **"API"** (`SOURCE_LABELS.api_server = 'API'`, `session-source.ts:4`).
   - To land in Recents, pick a source that is neither excluded nor a messaging id. `_normalize_session_source` (`api_server.py:2567-2573`) accepts only:
     `api_server, hermes_browser, browser→hermes_browser, cli, telegram, discord, slack, desktop, dashboard`; **anything else silently degrades to `api_server`.**
   - Of those, the ones that land in Desktop **Recents** are: **`desktop`**, **`cli`**, `dashboard`, `hermes_browser` (none of them are in `SIDEBAR_EXCLUDED_SOURCES`; `desktop` and `cli` are in `LOCAL_SESSION_SOURCE_IDS = ['cli', 'codex', 'desktop', 'gateway', 'kanban', 'local', 'tui']`, `session-source.ts:46`).
   - **Recommended: `"source": "desktop"`** — it is accepted by the API server, shows in Desktop Recents, and renders with the "Desktop" label.

4. **Reverse direction (Desktop → Raycast) works with no extra parameter.** `GET /api/sessions` on this adapter applies no source filter by default (`source = request.query.get("source") or None`, 3404) and orders by last activity, so sessions the Desktop created are listed. Read their transcripts with `GET /api/sessions/{id}/messages` and continue them with `POST /api/sessions/{id}/chat/stream` — both accept any id present in `state.db`.

5. **Other visibility filters to be aware of** (`list_sessions_rich`, `hermes_state.py:8646` ff., WHERE-clause assembly around 8755-8770, via `api_server.py:3406-3417`): archived rows (`archived = 1`) and hidden rows (`hidden = 1`) are excluded from `GET /api/sessions`; sub-agent runs and compression continuations are excluded unless `include_children=1`; pinned rows are back-filled past the limit.

6. **`X-Hermes-Session-Key` is optional and orthogonal.** It does **not** affect whether a session shows up in Desktop — it only scopes long-term memory. If the Raycast extension wants its conversations to share Honcho memory with a Desktop channel, it must send the *same* key string the gateway uses for that channel. **UNVERIFIED:** I did not find where the Desktop assigns a `session_key` value for its own chats, so I cannot state the exact string to mirror; a Raycast-specific stable key (e.g. `raycast:default`) is safe and does not break Desktop visibility.

7. **Concurrency caveat.** Two concurrent turns on the same `session_id` are *permitted* by design (C.2) but there is no transcript-level lock exposed to clients — driving the same session from Raycast and Desktop simultaneously will interleave writes. Prefer one live turn per session id.

8. **Compression rotation.** If a turn triggers context compression, the response's `session_id` (B.9) / the `assistant.completed`+`run.completed` events' `session_id` (B.10) will be a **different, child** id. The extension must follow that value forward, or later reads land on a parent row with a truncated transcript. `GET /api/sessions/{id}/messages` mitigates this by resolving forward automatically (3627).

---

# D) Error responses — complete enumeration for these routes

## D.1 The two envelope shapes

**(a) OpenAI-style** — `_openai_error(message, err_type="invalid_request_error", param=None, code=None)`, `api_server.py:1091-1105`. Always emits all four keys (nulls included):
```json
{"error": {"message": "…", "type": "invalid_request_error", "param": null, "code": "session_not_found"}}
```
The `message` is passed through `redact_sensitive_text(..., force=True)` before it crosses the HTTP boundary (1083-1089), so secrets never leak in errors (asserted by `tests/gateway/test_api_server.py:2146-2170`).

**(b) Bare-`error` shape** — a handful of legacy sites emit `{"error": {"message": ..., "type": ...}}` **without** `param`/`code`, and the auth failure uses a third variant. Clients must not assume `param`/`code` exist.

## D.2 Per-status catalogue

### 400 — Bad Request

| Route(s) | `code` | `message` | Citation |
|---|---|---|---|
| all JSON bodies | *(none)* | `Invalid JSON in request body` | 3364, 4176 |
| all JSON bodies | *(none)* | `Request body must be a JSON object` | 3367 |
| `/v1/chat/completions` | *(none, bare shape)* | `Missing or invalid 'messages' field` | 4181-4183 |
| `/v1/chat/completions` | *(none, bare shape)* | `No user message found in messages` | 4216-4219 |
| `/v1/responses` | *(none)* | `Missing 'input' field` / `'input' must be a string or array` / `No user message found in input` | 5350, 5381, 5428 |
| `/v1/responses` | *(none)* | `Cannot use both 'conversation' and 'previous_response_id'` | 5359 |
| `/v1/responses`, `/v1/runs` | *(none)* | `'conversation_history' must be an array of message objects` / `conversation_history[i] must have 'role' and 'content' fields` | 5390-5401 |
| session chat | `missing_message` | `Missing 'message' field` | 802-805 |
| session chat | `invalid_system_message` | `system_message must be a string` | 3743 |
| create session | `invalid_session_id` | `Invalid session ID` / `Session ID too long` | 3448-3452 |
| create session | `invalid_system_prompt` | `system_prompt must be a string` | 3455 |
| create/patch/fork | `invalid_title` | `Title already in use by session <id>` (built at 3527, returned at 3545) or the `ValueError` from `sanitize_title` (e.g. title >100 chars, `hermes_state.py:7961` `MAX_TITLE_LENGTH = 100`) | 3527, 3545, 3591, 3720 |
| patch session | `unsupported_session_field` | `Unsupported session fields: a, b` | 3578 |
| patch session | `invalid_session_field` | `'pinned' must be a boolean` | 3582 |
| messages | `invalid_pagination` | `limit and offset must be non-negative integers` / `order must be one of: oldest, latest` | 3649, 3635 |
| model lock | `missing_model` | `require_model_lock was set but no model/provider was provided` | 2427-2430 |
| any multimodal input | `unsupported_content_type` / `invalid_image_url` / `invalid_content_part` (with `param` set to e.g. `messages[0].content`) | see A.1 | 684-694 |
| header validation | *(none, bare shape)* | `Invalid session key` / `Session key too long` / `Invalid session ID` / `Session ID too long` | 2159-2172, 4262-4270 |
| route conflict | *(none)* | `Model route '<alias>' is pinned to provider '<p>'. Remove 'provider' or use '<p>'.` / `Model route '<alias>' pins route credentials/base_url. Do not combine it with an explicit 'provider'.` | 2626-2640 |
| body-limit middleware | `invalid_content_length` | `Invalid Content-Length header.` | 1174 |

Example (live-verifiable shape):
```json
{"error": {"message": "Unsupported session fields: model", "type": "invalid_request_error", "param": null, "code": "unsupported_session_field"}}
```

### 401 — Unauthorized

Single shape, from `_check_auth` (`api_server.py:1810-1837`). **Live-observed verbatim:**
```json
{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}
```
Note: **no `param` key** in this envelope. Returned for a missing header, a wrong token, or (on a named `/p/<profile>/` route) a missing profile-scoped key. A non-ASCII bearer token yields 401, not 500 (`tests/gateway/test_api_server.py:244-254`).

### 403 — Forbidden

Two distinct causes:
1. **CORS rejection** — an `Origin` header that is not allow-listed. **Body is empty, `Content-Length: 0`** (no JSON). Live-observed. `api_server.py:1002-1003, 1010-1011`.
2. **Session header without a configured API key** (`api_server.py:2143-2151`, `4243-4256`):
```json
{"error": {"message": "X-Hermes-Session-Key requires API key authentication. Configure API_SERVER_KEY to enable this feature.", "type": "invalid_request_error", "param": null, "code": null}}
```
```json
{"error": {"message": "Session continuation requires API key authentication. Configure API_SERVER_KEY to enable this feature.", "type": "invalid_request_error", "param": null, "code": null}}
```

### 404 — Not Found

| Cause | Body | Citation |
|---|---|---|
| Unknown session id (any `/api/sessions/{id}*` route) | `{"error":{"message":"Session not found: <id>","type":"invalid_request_error","param":null,"code":"session_not_found"}}` | 3379 |
| Unknown `previous_response_id` | `{"error":{"message":"Previous response not found: <id>","type":"invalid_request_error","param":null,"code":null}}` | 5414 |
| Unknown response on GET/DELETE `/v1/responses/{id}` | `{"error":{"message":"Response not found: <id>","type":"invalid_request_error","param":null,"code":null}}` | 5660, 5674 |
| Unknown `/p/<profile>/` prefix | `{"error": "Unknown or unconfigured profile"}` — **a bare string, not an object** | 2039-2042 |
| **Unrouted path** | **plain text `404: Not Found`, `Content-Type: text/plain`** — aiohttp's default. Live-observed on `GET /api/nope`. | aiohttp default |

### 409 — Conflict

| Cause | Body | Citation |
|---|---|---|
| `POST /api/sessions` with an existing id | `{"error":{"message":"Session already exists: <id>","type":"invalid_request_error","param":null,"code":"session_exists"}}` | 3543 |
| `POST /api/sessions/{id}/fork` with an existing fork id | same `session_exists` shape | 3694 |
| `require_model_lock` that cannot be routed | `{"error":{"message":"Requested Browser model lock cannot be routed; refusing silent global fallback","type":"invalid_request_error","param":null,"code":"model_lock_unavailable"}}` | 2432-2435 |

### 413 — Payload Too Large

`body_limit_middleware`, `api_server.py:1164-1186`. Threshold `MAX_REQUEST_BYTES = 10_000_000` (10 MB, line 154), enforced both by `Content-Length` pre-check and by aiohttp's `client_max_size` mid-read:
```json
{"error": {"message": "Request body too large.", "type": "invalid_request_error", "param": null, "code": "body_too_large"}}
```

### 429 — Too Many Requests

`_concurrency_limited_response`, `api_server.py:6247-6277`. Cap = `gateway.api_server.max_concurrent_runs` (0 disables). Applies to `/v1/chat/completions`, `/v1/responses`, `/v1/runs`. Header **`Retry-After: 1`**.
```json
{"error": {"message": "Too many concurrent runs (max 4)", "type": "rate_limit_error", "param": null, "code": "rate_limit_exceeded"}}
```
Asserted by `tests/gateway/test_api_server.py:276-282`.

**Note:** the session-chat routes (`/api/sessions/{id}/chat[/stream]`) do **not** call `_concurrency_limited_response` — they go through `@_admit_api_agent_request` only (3724, 3841). They can still return 503 while draining.

### 5xx

| Status | Cause | Body | Citation |
|---|---|---|---|
| **500** | Agent raised on non-streaming `/v1/chat/completions` or `/v1/responses` | `{"error":{"message":"Internal server error: <redacted>","type":"server_error","param":null,"code":null}}` | 4390-4394, 4416-4420, 5559-5563 |
| **500** | Model-lock persistence failed (session chat / stream / model routes) | `{"error":{"message":"Could not persist the requested session model lock","type":"invalid_request_error","param":null,"code":"model_lock_persistence_failed"}}` | 3764-3770, 3872-3878, 4143-4149 |
| **500** | `GET /api/model/options` failure | `{"error":{"message":"Failed to list model options.","type":"invalid_request_error","param":null,"code":"model_options_failed"}}` | 3134-3139 |
| **501** | Cron/jobs module unavailable (`/api/jobs*`) | `{"error": "Cron module not available"}` — bare string | 5695-5698 |
| **502** | Hard-fail on `/v1/chat/completions`: no assistant text **and** the run failed/partial. Extra headers `X-Hermes-Completed: false`, `X-Hermes-Partial: true\|false`. | see below | 4471-4484 |
| **503** | `SessionDB` unavailable (any `/api/sessions*` route) | `{"error":{"message":"Session database unavailable","type":"invalid_request_error","param":null,"code":"session_db_unavailable"}}` | 3372, 3400, 3445, 3586 |
| **503** | Gateway draining (all `@_admit_api_agent_request` routes). Header **`Retry-After: 1`**. | `{"error":{"message":"Gateway is draining existing work; retry shortly.","type":"invalid_request_error","param":null,"code":"gateway_draining"}}` | 1559-1570 |

**502 body verbatim shape** (`api_server.py:4472-4484`):
```json
{
  "error": {
    "message": "Agent run did not produce a response.",
    "type": "server_error",
    "param": null,
    "code": "agent_incomplete",
    "hermes": {"completed": false, "partial": true, "failed": false}
  }
}
```

### Errors that arrive INSIDE an already-open SSE stream

Once headers are flushed (status 200) failures cannot change the status code:

| Route | Terminal failure signal |
|---|---|
| `/v1/chat/completions` (stream) | one `chat.completion.chunk` with `finish_reason: "error"` carrying `error` + `hermes` blocks, then `data: [DONE]` (4656-4681; crash path 4700-4713). Note `error.type` is the exception class name when a real exception was caught, else `"agent_error"` (4671). |
| `/v1/responses` (stream) | `event: response.failed` with `response.error = {"message": …, "type": "server_error"}` (5224-5227, 5316-5319) |
| `/api/sessions/{id}/chat/stream` | `event: error` with `{"message": "<redacted>"}`, followed by `event: done` (4045-4048) |

A provider-auth failure is **not** an HTTP error at all: `_run_agent` catches `_ProviderAuthResolutionError` and returns a normal 200 whose assistant content is `"⚠️ Provider authentication failed: <exc>"` (`api_server.py:6539-6555`).

---

# E) Quick reference — recommended Raycast call sequence

1. `GET /health` (no auth) → liveness + version.
2. `GET /v1/capabilities` (auth) → feature-detect. Relevant flags asserted in tests: `features.session_chat`, `features.session_chat_streaming`, `features.session_fork`, `features.session_model_lock`, `features.session_continuity_header == "X-Hermes-Session-Id"`, `features.session_key_header == "X-Hermes-Session-Key"`, plus an `endpoints` map of every path (`api_server.py:3151-3222`).
3. `GET /api/sessions?limit=50&offset=0` → sidebar list (see B.1/B.2).
4. New chat: `POST /api/sessions` with `{"source": "desktop", "title": "…"}` → keep `session.id`.
5. Send: `POST /api/sessions/{id}/chat/stream` with `{"message": "…"}` → consume named SSE events (B.10); follow `assistant.completed.session_id` forward.
6. Reopen: `GET /api/sessions/{id}/messages?limit=120&order=latest`; page older with `offset=120&order=latest`.
7. Rename / pin / archive: `PATCH /api/sessions/{id}`. Delete: `DELETE /api/sessions/{id}`.
8. Change model for a session: `POST /api/sessions/{id}/model`, or pass `model`+`provider` on each chat call.
9. Model list: `GET /v1/models` (`{"object":"list","data":[{"id","object":"model","created","owned_by":"hermes","permission":[],"root","parent"}]}`, `api_server.py:3072-3100`) or the richer `GET /api/model/options` (`api_server.py:3103-3139`).

**Do not** use `/v1/chat/completions` as the primary chat surface for this extension: it has no session list, its default session ids are opaque hashes, and its `usage` field naming differs. It is only useful for OpenAI-SDK compatibility.
