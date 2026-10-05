# Hermes JOBS / automation API — ground truth

Research target: the `/api/jobs*` and `/api/cron/fire` HTTP surface of the Hermes Agent gateway.

**Sources of truth used (all local, read-only):**

| Short name | Absolute path |
|---|---|
| `api_server.py` | `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\gateway\platforms\api_server.py` |
| `cron/jobs.py` | `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\cron\jobs.py` |
| `cron/scheduler.py` | `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\cron\scheduler.py` |
| `cron/scheduler_provider.py` | `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\cron\scheduler_provider.py` |
| `cron/executions.py` | `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\cron\executions.py` |
| `hermes_time.py` | `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\hermes_time.py` |
| `tools/cronjob_tools.py` | `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\tools\cronjob_tools.py` |
| `chronos/verify.py` | `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\plugins\cron_providers\chronos\verify.py` |
| `test_api_server_jobs.py` | `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\tests\gateway\test_api_server_jobs.py` |
| chronos contract doc | `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent\docs\chronos-managed-cron-contract.md` |

**Live probes** were done against the running server on `http://127.0.0.1:8642` with `curl`, GET only. Server banner: `Server: Python/3.11 aiohttp/3.14.3`, `{"status": "ok", "platform": "hermes-agent", "version": "0.20.4"}`.

**Anything I could not verify is marked `UNVERIFIED`.** No secret values were read or copied anywhere in this document; only config *key names* and file *paths* appear.

---

## 0. TL;DR for the implementer

* 8 REST endpoints: `GET/POST /api/jobs`, `GET/PATCH/DELETE /api/jobs/{job_id}`, `POST /api/jobs/{job_id}/{pause|resume|run}`. All are `Authorization: Bearer <API_SERVER_KEY>`.
* A 9th endpoint `POST /api/cron/fire` exists but is **NOT** authenticated by `API_SERVER_KEY` — it takes a NAS/Chronos-minted **JWT**. A Raycast plugin should never call it.
* Response envelopes are `{"jobs": [...]}` for list, `{"job": {...}}` for every single-job route, `{"ok": true}` for delete.
* `schedule` is a **string** on the wire (`"every 30m"`, `"0 9 * * *"`, `"30m"`, `"2026-06-01T09:00:00"`) but is stored and **returned as a dict** (`{"kind": "...", ...}`). Display string is in `schedule_display`.
* `POST /api/jobs/{id}/run` does **not** run the job immediately — it just sets `next_run_at = now` and the ticker picks it up on its next pass (default 60 s).
* Invalid schedule strings return **500**, not 400 (see §11 "Error catalogue" — this is a real wart).

---

## 1. Routes, registration, auth

### 1.1 Route table (literal)

`api_server.py:2086-2093` — inside `_http_route_table()`:

```python
("GET", "/api/jobs", self._handle_list_jobs),
("POST", "/api/jobs", self._handle_create_job),
("GET", "/api/jobs/{job_id}", self._handle_get_job),
("PATCH", "/api/jobs/{job_id}", self._handle_update_job),
("DELETE", "/api/jobs/{job_id}", self._handle_delete_job),
("POST", "/api/jobs/{job_id}/pause", self._handle_pause_job),
("POST", "/api/jobs/{job_id}/resume", self._handle_resume_job),
("POST", "/api/jobs/{job_id}/run", self._handle_run_job),
```

`api_server.py:2101-2104` — the fire webhook is only registered when the cron module imported successfully:

```python
if _CRON_AVAILABLE:
    # Chronos managed-cron fire webhook (NAS → agent). Authenticated
    # by a NAS-minted JWT (NOT API_SERVER_KEY).
    routes.append(("POST", "/api/cron/fire", self._handle_cron_fire))
```

`_CRON_AVAILABLE` is set at `api_server.py:1283-1307`: it is `True` iff `from cron.jobs import ...` and `from cron.scheduler import ...` both succeed.

### 1.2 Every route is mirrored under `/p/{profile}/…`

`api_server.py:7476-7478`:

```python
for method, path, handler in self._http_route_table():
    self._app.router.add_route(method, path, handler)
    self._app.router.add_route(method, f"/p/{{profile}}{path}", handler)
```

So `GET /p/default/api/jobs` is also valid. When multiplexing is off the `/p/<x>/` prefix is **ignored**, not rejected (`_resolve_request_profile`, `api_server.py:1966-2002`).

*Live probe:* `GET /p/default/api/jobs` → `401`; `GET /p/bogus/api/jobs` → `401` (not 404), confirming multiplexing is off on this machine. Plugins should just use the unprefixed paths.

### 1.3 Auth

`_check_auth` (`api_server.py:1782-1834`) runs first in **every** jobs handler. It compares `Authorization: Bearer <token>` against `API_SERVER_KEY` with `hmac.compare_digest` on the encoded bytes.

Key location (name/path only, never the value):
* config key name: **`API_SERVER_KEY`**
* resolved for named profiles via `agent.secret_scope.get_secret("API_SERVER_KEY", "")` (`api_server.py:1768`), with a `min_length=16` usability guard (`api_server.py:1769`).

Literal 401 body — **copied from a live probe** of `GET http://127.0.0.1:8642/api/jobs` with no header:

```json
{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}
```

Same literal shape in source at `api_server.py:1805-1813` and `api_server.py:1831-1834`.

Full live response headers observed (useful to know a proxy isn't in the way):

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
```

Successful auth is proven by the test at `test_api_server_jobs.py:361-375` (`headers={"Authorization": "Bearer sk-secret"}` → 200).

### 1.4 Host/port and body cap

`api_server.py:151-154`:

```python
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8642
MAX_STORED_RESPONSES = 100
MAX_REQUEST_BYTES = 10_000_000  # 10 MB
```

`8644` responds `{"status": "ok", "platform": "webhook"}` — that is a *different* adapter (webhook), not the API server. Use **8642**.

### 1.5 Availability guard

`_check_jobs_available` (`api_server.py:5691-5698`) returns, when `_CRON_AVAILABLE` is false:

```json
{"error": "Cron module not available"}
```

with HTTP **501**. Pinned by `test_api_server_jobs.py:384-392`.

### 1.6 job_id validation

`api_server.py:5685`:

```python
_JOB_ID_RE = __import__("re").compile(r"[a-f0-9]{12}")
```

`_check_job_id` (`api_server.py:5700-5712`) uses `fullmatch`, so the id must be **exactly 12 lowercase hex chars**. Failure:

```json
{"error": "Invalid job ID format"}
```

HTTP **400**. Note the check runs *after* `_check_auth`, so an unauthenticated bad id still yields 401 (live probe of `GET /api/jobs/zzzzzzzzzzzz` → `401`).

Ids are generated as `uuid.uuid4().hex[:12]` (`cron/jobs.py:1875`), which matches the regex.

> Caveat: the underlying `pause_job` / `resume_job` / `trigger_job` / `remove_job` accept **an id OR a name** (`resolve_job_ref`, `cron/jobs.py:2029-2051`), but the REST layer's regex means only ids ever reach them over HTTP.

---

## 2. The job record — every field

The shape returned by the API is whatever `cron/jobs.py` returns, passed straight through `web.json_response`. Two normalization layers apply:

* `_normalize_job_record` (`cron/jobs.py:529-562`) — applied by `get_job`, `list_jobs`, `update_job`, `resolve_job_ref`. It coerces `prompt`/`name`/`id` to strings, fills `schedule_display`, aligns `skills`/`skill`, and **overwrites `state`** with `effective_job_state(job)`.
* `_apply_skill_fields` (`cron/jobs.py:496-503`) — `skills` is the canonical list, `skill` is `skills[0] or None`.

### 2.1 Literal creation shape

Copied from `create_job`, `cron/jobs.py:1948-1992` (this is the exact dict written to disk):

```python
job = {
    "id": job_id,
    "name": name or label_source[:50].strip(),
    "prompt": prompt_text,
    "skills": normalized_skills,
    "skill": normalized_skills[0] if normalized_skills else None,
    "model": normalized_model,
    "provider": normalized_provider,
    "provider_snapshot": provider_snapshot,
    "model_snapshot": model_snapshot,
    "base_url": normalized_base_url,
    "script": normalized_script,
    "no_agent": normalized_no_agent,
    "monitor_script": normalized_monitor_script,
    "monitor_url": normalized_monitor_url,
    "monitor_state": None,
    "context_from": context_from,
    "schedule": parsed_schedule,
    "schedule_display": parsed_schedule.get("display", schedule),
    "repeat": {
        "times": repeat,  # None = forever
        "completed": 0
    },
    "enabled": True,
    "state": "scheduled",
    "paused_at": None,
    "paused_reason": None,
    "created_at": now,
    "next_run_at": next_run_at,
    "last_run_at": None,
    "last_status": None,
    "last_error": None,
    "last_delivery_error": None,
    "failure_streak": 0,
    # Delivery configuration
    "deliver": deliver,
    "origin": origin,
    "enabled_toolsets": normalized_toolsets,
    "workdir": normalized_workdir,
}
```

`attach_to_session` is added **only** when explicitly set — i.e. when the caller passed a real `bool` (`cron/jobs.py:1888`, `1996-1997`).

### 2.2 Field reference

| Field | Type | Meaning / citation |
|---|---|---|
| `id` | string, 12 lowercase hex | `uuid.uuid4().hex[:12]`, `cron/jobs.py:1875`. Immutable — `update_job` raises if you try (`_IMMUTABLE_JOB_FIELDS = frozenset({"id"})`, `cron/jobs.py:460`, enforced `cron/jobs.py:2074-2079`). |
| `name` | string | Friendly name. If absent at create, derived from prompt/skill/script truncated to 50 chars (`label_source`, `cron/jobs.py:1925`; applied `cron/jobs.py:1950`). `_normalize_job_record` re-derives it if blank on read (`cron/jobs.py:539-552`). |
| `prompt` | string (may be `""`) | The self-contained instruction the agent runs. |
| `skills` | array of strings | Canonical skill list, deduped and order-preserving (`_normalize_skill_list`, `cron/jobs.py:479-493`). |
| `skill` | string or `null` | Legacy mirror = `skills[0]`. |
| `model` | string or `null` | Per-job model override. **Not settable via REST.** |
| `provider` | string or `null` | Per-job provider override. **Not settable via REST.** |
| `provider_snapshot`, `model_snapshot` | string or `null` | Provider/model resolution captured at creation time for unpinned jobs (`cron/jobs.py:1959-1962`). Informational only. |
| `base_url` | string or `null` | Per-job base URL override. Not settable via REST. |
| `script` | string or `null` | Script whose stdout feeds the job (or IS the job when `no_agent`). Not settable via REST. |
| `no_agent` | bool | Skip the LLM; deliver script stdout verbatim. Not settable via REST. |
| `monitor_script`, `monitor_url` | string or `null` | Monitor-mode source; hash-unchanged output suppresses the run entirely (`cron/jobs.py:1845-1858`). Not settable via REST. |
| `monitor_state` | object or `null` | `{"last_output_hash": ..., "last_changed_at": ...}` (`cron/jobs.py:1965-1967`). |
| `context_from` | array of job ids or `null` | Chains a prior job's most recent output into this prompt (docstring `cron/jobs.py:1824-1826`; normalization `cron/jobs.py:1908-1913`). |
| `schedule` | **object** | `{"kind": "once"\|"interval"\|"cron", …}` — see §5. |
| `schedule_display` | string | Human display, e.g. `"every 30m"`, `"0 9 * * *"`, `"once at 2026-06-01 09:00"`. Fallback logic in `_schedule_display_for_job` (`cron/jobs.py:512-527`) returns `"?"` when nothing resolves. **Use this for UI.** |
| `repeat` | object | `{"times": int\|null, "completed": int}`. `times: null` = forever. |
| `enabled` | bool | **The scheduler-honoured flag.** `is_job_runnable` (`cron/jobs.py:571-583`) requires `enabled` true AND no pause marker. |
| `state` | string | Derived on read by `effective_job_state` (`cron/jobs.py:585-603`). Values seen in source: `"scheduled"`, `"paused"`, `"completed"`, `"error"`. Rule: terminal states win; `enabled=true` is authoritative and **never** renders as `paused`. |
| `paused_at` | ISO string or `null` | Set by `pause_job` (`cron/jobs.py:2206`). |
| `paused_reason` | string or `null` | Optional; REST pause never sets it (no body is read). |
| `created_at` | ISO string with offset | `_hermes_now().isoformat()` (`cron/jobs.py:1876`). |
| `next_run_at` | ISO string with offset, or `null` | See §10. |
| `last_run_at` | ISO string or `null` | Written by `_mark_job_run_locked` (`cron/jobs.py:2435-2436`). **Note the field is `last_run_at`, not `last_run`.** |
| `last_status` | string or `null` | `"ok"` / `"error"`, or an override such as `"blocked_config"` (`cron/jobs.py:2437`, docstring `cron/jobs.py:2416-2421`). |
| `last_error` | string or `null` | Agent-side error. |
| `last_delivery_error` | string or `null` | Delivery-side error, tracked separately from `last_error` (docstring `cron/jobs.py:2413-2414`; assigned `cron/jobs.py:2461`). |
| `failure_streak` | int | Consecutive agent failures; any success resets to 0; delivery failures don't count (`cron/jobs.py:2451-2459`). |
| `deliver` | string | See §9. Default over REST is `"local"`. |
| `origin` | object or `null` | Provenance; for REST-created jobs see §4.4. |
| `enabled_toolsets` | array or `null` | Restricts the tool surface. Not settable via REST. |
| `workdir` | absolute path string or `null` | Job's working directory / context-file root. Not settable via REST. |
| `attach_to_session` | bool | Present only when explicitly set. |
| `fire_claim` | object or `null` | External-fire CAS claim; cleared on completion (`cron/jobs.py:2464`). Internal. |
| `run_claim` | object or `null` | One-shot running claim; cleared on completion (`cron/jobs.py:2468-2469`). Internal. |
| `preflight_alerted`, `drift_alerted`, `last_fire_error` | present only transiently | popped on a successful run (`cron/jobs.py:2444-2450`). |
| `latest_execution` | object or `null` | **Only added by `list_jobs`** — see §3.2. |

**Important:** these fields are *not guaranteed present*. Older records on disk lack fields added later. Verified on the real local store `C:\Users\<usuario>\AppData\Local\hermes\cron\jobs.json`: its single job record has these keys and **no** `failure_streak`, `monitor_script`, `monitor_url`, `monitor_state`, `attach_to_session`:

```json
["id","name","prompt","skills","skill","model","provider","provider_snapshot","model_snapshot","base_url","script","no_agent","context_from","schedule","schedule_display","repeat","enabled","state","paused_at","paused_reason","created_at","next_run_at","last_run_at","last_status","last_error","last_delivery_error","deliver","origin","enabled_toolsets","workdir","fire_claim"]
```

A client must treat **every** field except `id` as optional.

### 2.3 Fields the task brief asked about that do NOT exist under that name

| Asked-for name | Actual name |
|---|---|
| `cron expression` | `schedule.expr` (only when `schedule.kind == "cron"`) |
| `timezone` | **No per-job timezone field exists.** Timezone is global — see §7. |
| `paused` | `state == "paused"` and/or `enabled == false` |
| `last_run` | `last_run_at` |
| `next_run` | `next_run_at` |
| `status` | `state` (lifecycle) + `last_status` (last run outcome) |
| `destination` / `target platform` | `deliver` (string), plus `origin` (object) |

---

## 3. `GET /api/jobs`

Handler `api_server.py:5714-5727`.

### 3.1 Request

```
GET /api/jobs?include_disabled=true
Authorization: Bearer <API_SERVER_KEY>
```

Only one query param exists (`api_server.py:5722`):

```python
include_disabled = request.query.get("include_disabled", "").lower() in {"true", "1"}
```

So `true`, `TRUE`, `1` all enable it; anything else (including `yes`) is false. Default is **false**, which **hides every paused/disabled job** — `list_jobs` filters on `enabled` (`cron/jobs.py:2057-2058`). A Raycast list view almost certainly wants `include_disabled=true`.

`test_api_server_jobs.py:414-432` (`test_list_handler_no_self_binding`) pins the *plumbing* — that `?include_disabled=true` arrives at `_cron_list` as `include_disabled=True`. There is **no** test for the filtering itself; the file has only a placeholder comment where `test_list_jobs_include_disabled` would go (`test_api_server_jobs.py:100-102`). The filtering behaviour is read from `cron/jobs.py:2057-2058` directly.

### 3.2 Response

Envelope is `{"jobs": [ ... ]}` (`api_server.py:5724`). `list_jobs` (`cron/jobs.py:2054-2068`) additionally attaches `latest_execution` to each job:

```python
for job in jobs:
    job["latest_execution"] = latest.get(job.get("id", ""))
```

`latest_execution` is a row of the `executions` SQLite table (`cron/executions.py:44-57`), so its literal shape is:

```json
{
  "id": "9f2c1a4b7e8d4f0aa1b2c3d4e5f60718",
  "job_id": "aabbccddeeff",
  "source": "builtin",
  "process_id": "3c9d0e5f6a7b8c9d0e1f2a3b4c5d6e7f",
  "pid": 21344,
  "process_started_at": 133700000000000000,
  "status": "completed",
  "claimed_at": "2026-08-19T09:00:00.123456-03:00",
  "started_at": "2026-08-19T09:00:00.456789-03:00",
  "finished_at": "2026-08-19T09:00:41.998877-03:00",
  "error": null
}
```

`status` is constrained by a CHECK to `('claimed','running','completed','failed','unknown')` (`cron/executions.py:51-52`). `source` is **not** constrained by the schema; the only values written in-tree are `"direct"` (`cron/scheduler.py:6242`), `"builtin"` (`cron/scheduler.py:7025`) and the active provider's `name` (`cron/scheduler_provider.py:185`, e.g. `"chronos"`) — a client must treat it as an open string. `latest_execution` is `null` when the job has never been claimed. The ledger lives at `<HERMES_HOME>/cron/executions.db` (`cron/executions.py:31`) and keeps at most `MAX_TERMINAL_EXECUTIONS = 1000` terminal rows (`cron/executions.py:24`).

> `GET /api/jobs/{job_id}` calls `get_job`, which does **not** attach `latest_execution`. The field exists only on the list route.

### 3.3 Literal example response

Field names/types are exactly those in `create_job` + the real on-disk record; values are illustrative (the real store's prompt content is the user's private data and is not reproduced):

```json
{
  "jobs": [
    {
      "id": "aabbccddeeff",
      "name": "morning digest",
      "prompt": "Summarize unread GitHub notifications and list the top 3 items.",
      "skills": [],
      "skill": null,
      "model": null,
      "provider": null,
      "provider_snapshot": "anthropic",
      "model_snapshot": "claude-sonnet-4-5",
      "base_url": null,
      "script": null,
      "no_agent": false,
      "context_from": null,
      "schedule": {"kind": "cron", "expr": "0 9 * * *", "display": "0 9 * * *"},
      "schedule_display": "0 9 * * *",
      "repeat": {"times": null, "completed": 12},
      "enabled": true,
      "state": "scheduled",
      "paused_at": null,
      "paused_reason": null,
      "created_at": "2026-08-01T07:12:03.114522-03:00",
      "next_run_at": "2026-08-20T09:00:00-03:00",
      "last_run_at": "2026-08-19T09:00:41.998877-03:00",
      "last_status": "ok",
      "last_error": null,
      "last_delivery_error": null,
      "failure_streak": 0,
      "deliver": "local",
      "origin": {"platform": "api_server", "chat_id": "api"},
      "enabled_toolsets": null,
      "workdir": null,
      "fire_claim": null,
      "latest_execution": null
    }
  ]
}
```

The minimal shape the test suite asserts round-trips unchanged (`test_api_server_jobs.py:31-38, 94-98`):

```json
{"jobs": [{"id": "aabbccddeeff", "name": "test-job", "schedule": "*/5 * * * *", "prompt": "do something", "deliver": "local", "enabled": true}]}
```

(In that test `_cron_list` is mocked, which is why `schedule` appears as a bare string there. **In production it is always the dict form.**)

---

## 4. `POST /api/jobs`

Handler `api_server.py:5729-5781`.

### 4.1 The complete creatable body

Only these six keys are read (`api_server.py:5738-5744`):

```python
body = await request.json()
name = (body.get("name") or "").strip()
schedule = (body.get("schedule") or "").strip()
prompt = body.get("prompt", "")
deliver = body.get("deliver", "local")
skills = body.get("skills")
repeat = body.get("repeat")
```

Everything else in the body is silently ignored. In particular **`model`, `provider`, `base_url`, `script`, `no_agent`, `monitor_script`, `monitor_url`, `context_from`, `enabled_toolsets`, `workdir`, `attach_to_session` CANNOT be set over REST**, even though `create_job` supports them (`cron/jobs.py:1780-1799`). Only the agent-facing `cronjob` tool and the CLI reach those.

Literal maximal REST body:

```json
{
  "name": "morning digest",
  "schedule": "0 9 * * *",
  "prompt": "Summarize unread GitHub notifications and list the top 3 items.",
  "deliver": "telegram",
  "skills": ["github"],
  "repeat": 10
}
```

Literal minimal body (from `test_api_server_jobs.py:121-128`):

```json
{"name": "test-job", "schedule": "*/5 * * * *", "prompt": "do something"}
```

### 4.2 Required vs optional

| Field | Required | Rule | Citation |
|---|---|---|---|
| `name` | **YES** | non-empty after `.strip()`; ≤ **200** chars | `api_server.py:5746-5751`, `_MAX_NAME_LENGTH = 200` at `5688` |
| `schedule` | **YES** | non-empty after `.strip()`; grammar in §5 | `api_server.py:5752-5753` |
| `prompt` | no (defaults `""`) | ≤ **5000** chars; threat-scanned when non-empty | `api_server.py:5754-5762`, `_MAX_PROMPT_LENGTH = 5000` at `5689` |
| `deliver` | no (defaults `"local"`) | **not validated at all at this layer** | `api_server.py:5742` |
| `skills` | no | passed through only when truthy (`if skills:`) | `api_server.py:5773-5774` |
| `repeat` | no | if present must be `int` and `>= 1` | `api_server.py:5763-5764` |

> Note the asymmetry vs the agent tool: the tool requires `prompt` for create; the REST layer does not. A REST job with `name` + `schedule` and no prompt is accepted and will run an empty prompt.

Validation error bodies, literal:

```json
{"error": "Name is required"}
{"error": "Name must be ≤ 200 characters"}
{"error": "Schedule is required"}
{"error": "Prompt must be ≤ 5000 characters"}
{"error": "Repeat must be a positive integer"}
```

All HTTP **400**. (The `≤` is a literal U+2264 in the f-string at `api_server.py:5750` / `5756`.)

### 4.3 Prompt threat scan (400)

`api_server.py:5758-5762` calls `tools.cronjob_tools._scan_cron_prompt` (`tools/cronjob_tools.py:260-279`). On a hit it returns 400 with that scanner's literal message:

```json
{"error": "Blocked: prompt matches threat pattern 'read_secrets'. Cron prompts must not contain injection or exfiltration payloads."}
```

Pattern ids that can appear (`tools/cronjob_tools.py:98-107` and `124-135`): `prompt_injection`, `deception_hide`, `sys_prompt_override`, `disregard_rules`, `read_secrets`, `ssh_backdoor`, `sudoers_mod`, `destructive_root_rm`, `exfil_curl_url`, `exfil_wget_url`, `exfil_curl_data`, `exfil_wget_post`, `exfil_curl_auth_header`. An invisible-unicode check runs first (`tools/cronjob_tools.py:270-272`). Test: `test_api_server_jobs.py:481-499`.

### 4.4 What actually gets called

`api_server.py:5765-5777`:

```python
kwargs = {
    "prompt": prompt,
    "schedule": schedule,
    "name": name,
    "deliver": deliver,
    "origin": self._cron_origin_from_request(request),
}
if skills:
    kwargs["skills"] = skills
if repeat is not None:
    kwargs["repeat"] = repeat

job = _cron_create(**kwargs)
```

`_cron_create` is `cron.scheduler.create_job_with_scheduler_registration` (`api_server.py:1294-1297`), which is `create_job(**kwargs)` followed by `resolve_cron_scheduler().register_job(job)` (`cron/scheduler.py:6709-6719`).

`_cron_origin_from_request` (`api_server.py:1735-1752`) produces at most:

```json
{
  "platform": "api_server",
  "chat_id": "api",
  "source_ip": "127.0.0.1",
  "peer_ip": "127.0.0.1",
  "forwarded_for": "203.0.113.11",
  "real_ip": "10.0.0.5",
  "user_agent": "cron-client"
}
```

`platform` and `chat_id` are always present; the other **five** (`source_ip`, `peer_ip`, `forwarded_for`, `real_ip`, `user_agent`) are each included only when the corresponding request metadata is non-empty — remote address, peer address, `X-Forwarded-For`, `X-Real-IP`, `User-Agent` respectively (`api_server.py:1738-1751`). Pinned by `test_api_server_jobs.py:137-140`.

### 4.5 Success response

`api_server.py:5778` → HTTP **200** (not 201) with `{"job": {...}}`, the full record from §2.1.

### 4.6 Partial-failure response — HTTP 424

If the job was persisted but the external scheduler provider refused to arm it, `CronSchedulerRegistrationError` is raised and returned with status **424** (`api_server.py:5779-5780`). `to_dict()` at `cron/scheduler.py:6698-6706`:

```json
{
  "error": "Cron job 'aabbccddeeff' was saved, but its first scheduler registration failed (RuntimeError). Do not create a duplicate. Pause/resume or update the job to retry registration.",
  "job_id": "aabbccddeeff",
  "job_saved": true,
  "scheduler_registered": false,
  "retry_create": false
}
```

Client contract: **do not retry the create.** Pinned by `test_api_server_jobs.py:144-169`, which also asserts the provider's internal cause string is not leaked into `error`.

---

## 5. The schedule expression grammar

Everything is decided by `parse_schedule` (`cron/jobs.py:694-789`). It accepts **four** forms, tried in this order:

### 5.1 `every <duration>` → recurring interval

`cron/jobs.py:716-724`. Prefix match on the lowercased string `"every "`, remainder parsed by `parse_duration` (`cron/jobs.py:673-691`):

```python
match = re.match(r'^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$', s)
```

Multipliers: `m` = 1, `h` = 60, `d` = 1440 (minutes). Result:

```json
{"kind": "interval", "minutes": 30, "display": "every 30m"}
```

Examples: `"every 30m"`, `"every 2h"`, `"every 1d"`, `"every 45 minutes"`.

> The `display` is **always rebuilt in minutes** — `f"every {minutes}m"` (`cron/jobs.py:723`). So `"every 2h"` comes back with `schedule_display: "every 120m"`, and `"every 1d"` as `"every 1440m"`. The UI will not echo what the user typed for this schedule kind. (Contrast §5.4, where the bare-duration display uses the original string.)

### 5.2 5-or-6-field cron expression

`cron/jobs.py:726-743`. Detection is **not** croniter-first — it is a shape test:

```python
parts = schedule.split()
if len(parts) >= 5 and all(
    re.match(r'^[\d\*\-,/]+$', p) for p in parts[:5]
):
```

So the first five whitespace-separated fields must contain only digits, `*`, `-`, `,`, `/`. Named forms (`@daily`, `MON`, `JAN`) do **not** match this shape and fall through to the error branch. Once matched, `croniter(schedule)` validates it; failure raises `ValueError(f"Invalid cron expression '{schedule}': {e}")`. Result:

```json
{"kind": "cron", "expr": "0 9 * * *", "display": "0 9 * * *"}
```

Requires the `croniter` package; without it, `parse_schedule` raises `ValueError("Cron expressions require 'croniter' package. Install with: pip install croniter")` (`cron/jobs.py:732-733`). croniter is imported lazily (`_ensure_croniter`, `cron/jobs.py:52-62`).

### 5.3 ISO timestamp → one-shot

`cron/jobs.py:745-771`. Triggered when the string contains `T` **or** starts with `\d{4}-\d{2}-\d{2}` (`cron/jobs.py:746`). Parsed with `datetime.fromisoformat(schedule.replace('Z', '+00:00'))`. **A naive timestamp is anchored to the configured Hermes timezone, not the server's local zone** (`cron/jobs.py:762-764`). Result:

```json
{"kind": "once", "run_at": "2026-06-01T09:00:00-03:00", "display": "once at 2026-06-01 09:00"}
```

### 5.4 Bare duration → one-shot from now

`cron/jobs.py:773-783`. `"30m"`, `"2h"`, `"1d"` → run once at `now + duration`. Unlike §5.1 the display echoes the **original** string (`f"once in {original}"`, `cron/jobs.py:780`):

```json
{"kind": "once", "run_at": "2026-08-19T20:01:31.114522-03:00", "display": "once in 30m"}
```

### 5.5 Nothing matched → ValueError

Literal message (`cron/jobs.py:785-791`), newlines included:

```
Invalid schedule '<original>'. Use:
  - Duration: '30m', '2h', '1d' (one-shot)
  - Interval: 'every 30m', 'every 2h' (recurring)
  - Cron: '0 9 * * *' (cron expression)
  - Timestamp: '2026-02-03T14:00:00' (one-shot at time)
```

**This surfaces as HTTP 500, not 400** — see §11.

### 5.6 Natural language?

**No.** There is no NL date parser in `parse_schedule`. The only English-ish token is the literal prefix `every ` and the duration unit words. Anything like `"tomorrow at 9"` or `"@daily"` is rejected.

### 5.7 One-shot creation guards

* `repeat <= 0` is normalized to `None` (forever) (`cron/jobs.py:1863-1865`). Note the REST layer already rejects `repeat < 1` with a 400, so this branch is only reachable via the tool/CLI.
* A `once` schedule with no explicit repeat gets `repeat = 1` (`cron/jobs.py:1867-1869`).
* A one-shot whose `run_at` is more than `ONESHOT_GRACE_SECONDS = 120` (`cron/jobs.py:118`) in the past is **rejected at create** with:
  `Requested one-shot time {run_at} is more than 120s in the past and cannot be scheduled.` (`cron/jobs.py:1943-1946`) → surfaces as 500.

---

## 6. `GET` / `PATCH` / `DELETE /api/jobs/{job_id}`

### 6.1 `GET /api/jobs/{job_id}` — `api_server.py:5784-5801`

Calls `_cron_get(job_id)` = `cron.jobs.get_job` (`cron/jobs.py:2007-2013`), exact id match only, normalized on the way out.

* 200 → `{"job": { ... }}` (same shape as §2, **without** `latest_execution`)
* 404 → `{"error": "Job not found"}`
* 400 → `{"error": "Invalid job ID format"}`

Test: `test_api_server_jobs.py:194-208`.

### 6.2 `PATCH /api/jobs/{job_id}` — `api_server.py:5803-5839`

Whitelist (`api_server.py:5687`):

```python
_UPDATE_ALLOWED_FIELDS = {"name", "schedule", "prompt", "deliver", "skills", "skill", "repeat", "enabled"}
```

Every other key in the body is dropped silently (`api_server.py:5817`, pinned by `test_api_server_jobs.py:218-242` which sends `evil_field` and `__proto__`).

Literal body:

```json
{"name": "new-name", "schedule": "every 10m", "prompt": "…", "deliver": "telegram", "skills": [], "enabled": false}
```

Validation performed at the API layer:
* empty sanitized dict → 400 `{"error": "No valid fields to update"}` (`api_server.py:5818-5819`)
* `name` length ≤ 200 → 400 (`5820-5823`)
* `prompt` length ≤ 5000 → 400 (`5824-5827`)
* `prompt` threat scan → 400 (`5828-5831`)
* **`repeat` is whitelisted but NOT validated here** (unlike create).

Then `_cron_update(job_id, sanitized)` = `cron.jobs.update_job` (`cron/jobs.py:2070-2192`). Semantics worth knowing:

* `schedule` may be sent as a **raw string**; `update_job` re-runs `parse_schedule` on it and refreshes `schedule_display` and `next_run_at` (`cron/jobs.py:2133-2144`). A one-shot set into the past (> 120 s) raises → 500 (`cron/jobs.py:2152-2167`).
* `next_run_at` is only recomputed when the job isn't paused (`if updated.get("state") != "paused"`, `cron/jobs.py:2145`), plus a repair branch that fills a missing `next_run_at` for any enabled non-paused job (`cron/jobs.py:2180-2188`).
* `skills: []` clears skills; `skill` and `skills` are re-aligned (`cron/jobs.py:2128-2131`).
* `id` cannot be patched (it isn't whitelisted anyway, and `update_job` would raise).

On success: 200 `{"job": {...}}` and `_notify_cron_provider_jobs_changed()` fires (`api_server.py:5836`) so an external provider re-arms.
On unknown id: 404 `{"error": "Job not found"}`.

> **HAZARD — `repeat` over PATCH.** `update_job` merges raw (`_apply_skill_fields({**job, **updates})`, `cron/jobs.py:2105`) and never coerces `repeat`. Sending `{"repeat": 3}` stores the integer `3` where the rest of the code expects `{"times":…, "completed":…}`; `_mark_job_run_locked` then does `repeat.get("times")` on an int (`cron/jobs.py:2476-2478`) which raises `AttributeError`. **Clients should never PATCH `repeat`.** (Code-traceable; I did not execute it — runtime crash is `UNVERIFIED`.)

### 6.3 `DELETE /api/jobs/{job_id}` — `api_server.py:5841-5859`

Calls `_cron_remove` = `cron.jobs.remove_job` (`cron/jobs.py:2254-2291`), which also deletes `<cron>/output/<job_id>/`, clears the job's notepad rows, and prunes its fire-fence lock entry.

* 200 → `{"ok": true}` (`api_server.py:5857`, test `test_api_server_jobs.py:251-265`)
* 404 → `{"error": "Job not found"}`

`_notify_cron_provider_jobs_changed()` is called on success (`api_server.py:5856`).

---

## 7. `pause` / `resume` / `run`

**None of these three endpoints reads a request body.** Send `POST` with no body (or an empty one); it is ignored. All three return `{"job": {...}}` on success and `{"error": "Job not found"}` with 404 otherwise.

### 7.1 `POST /api/jobs/{job_id}/pause` — `api_server.py:5861-5879`

`_cron_pause` = `pause_job` (`cron/jobs.py:2196-2210`), which applies:

```python
{
    "enabled": False,
    "state": "paused",
    "paused_at": _hermes_now().isoformat(),
    "paused_reason": reason,      # always None over REST
}
```

Then `_notify_cron_provider_jobs_changed()`. Test: `test_api_server_jobs.py:274-290`.

### 7.2 `POST /api/jobs/{job_id}/resume` — `api_server.py:5881-5899`

`_cron_resume` = `resume_job` (`cron/jobs.py:2212-2235`). Recomputes `next_run_at` from **now**, then applies:

```python
{
    "enabled": True,
    "state": "scheduled",
    "paused_at": None,
    "paused_reason": None,
    "next_run_at": next_run_at,
}
```

If the job is a one-shot whose time has passed, it raises `Cannot resume: one-shot time {run_at} is in the past (grace window: 120s) and will never fire.` → **500** (see §11).

### 7.3 `POST /api/jobs/{job_id}/run` — `api_server.py:5901-5921`

**This does not execute the job.** `_cron_trigger` = `trigger_job` (`cron/jobs.py:2237-2252`) merely applies:

```python
{
    "enabled": True,
    "state": "scheduled",
    "paused_at": None,
    "paused_reason": None,
    "next_run_at": _hermes_now().isoformat(),
}
```

The job then fires on the next scheduler tick. The built-in ticker interval is `TICKER_INTERVAL_SECONDS = 60` (`cron/jobs.py:99`), so expect up to ~60 s of latency, and **the job must be picked up by a running gateway ticker** — if no ticker is alive nothing happens.

Two more differences from the other mutation routes:

1. It **does** check gateway drain, immediately after auth and *before* the cron-availability and job-id checks — `self._draining_response()` (`api_server.py:5906-5908`), which returns **503** with `Retry-After: 1` and body (`api_server.py:1559-1570`):

```json
{"error": {"message": "Gateway is draining existing work; retry shortly.", "type": "invalid_request_error", "param": null, "code": "gateway_draining"}}
```

2. It **does not** call `_notify_cron_provider_jobs_changed()` (compare `api_server.py:5916-5918` with `5836`, `5856`, `5876`, `5896`). Under an external provider (chronos) the re-arm to "now" may therefore not propagate promptly. `UNVERIFIED` in practice — the local install uses the built-in ticker (see §9.5).

> Contrast with the agent-facing `cronjob(action="run")` tool, which really does execute the job immediately in the background (`tools/cronjob_tools.py:1391-1440`). The REST route has no equivalent.

Test: `test_api_server_jobs.py:324-339`.

---

## 8. `POST /api/cron/fire`

Handler `api_server.py:5923-6069`. Read this before assuming anything: **it is a machine-to-machine webhook for the Chronos managed-cron provider, not a "run this job now" API.**

### 8.1 The token — definitively NOT `API_SERVER_KEY`

`api_server.py:5924-5933` (docstring, verbatim):

> Authenticated by a NAS-minted JWT (verified via the pluggable fire-verifier), NOT API_SERVER_KEY — NAS holds no API server key, and this is the only inbound that can trigger remote job execution, so it gets its own purpose-scoped token check.

The handler (`api_server.py:5938-5948`):

```python
auth = request.headers.get("Authorization", "")
token = auth[7:].strip() if auth.startswith("Bearer ") else ""

cfg = load_config()
verifier = get_fire_verifier()
verify_kwargs = dict(
    token=token,
    expected_audience=cfg_get(cfg, "cron", "chronos", "expected_audience", default=""),
    jwks_or_key=cfg_get(cfg, "cron", "chronos", "nas_jwks_url", default="") or None,
    issuer=cfg_get(cfg, "cron", "chronos", "portal_url", default="") or None,
)
```

So the token is a **JWT** verified by `plugins/cron_providers/chronos/verify.py::verify_nas_fire_token` (`verify.py:81-141`). It must satisfy **all** of:

* signature verifies against the JWKS at config key `cron.chronos.nas_jwks_url` (or an inline PEM), algorithms `["RS256","RS384","RS512","ES256","ES384"]` — symmetric secrets are rejected (`verify.py:127`, docstring `verify.py:90-91`);
* `aud` == config key `cron.chronos.expected_audience` (the agent's `agent:{instance_id}`);
* `iss` == config key `cron.chronos.portal_url` when configured;
* `exp` present and valid, `nbf` valid, 30 s leeway (`leeway_seconds: int = 30`, `verify.py:85`; `options = {"require": ["exp", "aud"]}`, `verify.py:125`);
* `purpose == "cron_fire"` — the constant `_FIRE_PURPOSE = "cron_fire"` at `verify.py:29`, checked at `verify.py:140-142`. A general agent JWT is explicitly not replayable here.

If no key is configured, the verifier logs and returns `None` — it never falls back to an unsigned decode (`verify.py:103-107`). If the verifier raises, the handler fails closed (`api_server.py:5959-5964`).

**Configuration key names** (values never read here) — from the contract doc `docs/chronos-managed-cron-contract.md:205-212`:

| key | meaning |
|---|---|
| `cron.provider` | `"chronos"` to activate (empty = built-in ticker) |
| `cron.chronos.portal_url` | NAS base URL (also the expected JWT `iss`) |
| `cron.chronos.callback_url` | the agent's own public base URL for NAS→agent fires |
| `cron.chronos.expected_audience` | this agent's JWT `aud` (`agent:{instance_id}`) |
| `cron.chronos.nas_jwks_url` | NAS JWKS for verifying the fire JWT |

These live in `config.yaml` under the active `HERMES_HOME`. The doc states they are all non-secret (`docs/chronos-managed-cron-contract.md:202-204`).

### 8.2 Request body

Only `job_id` is used (`api_server.py:5977-5982`). The contract doc (`docs/chronos-managed-cron-contract.md:159`) gives the literal wire body:

```json
{"job_id": "ab12cd34", "fire_at": "..."}
```

### 8.3 Responses (literal)

| Condition | Status | Body |
|---|---|---|
| token invalid / missing / expired / wrong aud / wrong purpose | 401 | `{"error": "invalid fire token"}` (`api_server.py:5970`) |
| gateway draining | 503 | draining envelope, §7.3 (checked *after* the token, `api_server.py:5971-5973`) |
| `job_id` missing/empty | 400 | `{"error": "missing job_id"}` (`api_server.py:5982`) |
| accepted (legacy single-phase provider) | 202 | `{"status": "accepted", "job_id": "<id>"}` (`api_server.py:6031-6033`) |
| accepted (split-fire provider) | 202 | `{"status": "accepted", "job_id": "<id>"}` (`api_server.py:6069`) |
| claim already taken (duplicate fire) | 200 | `{"status": "duplicate", "job_id": "<id>"}` (`api_server.py:6046-6049`) |
| claim step itself failed | 503 | `{"error": "cron fire admission failed", "job_id": "<id>"}` (`api_server.py:6041-6044`) |

The 202 is returned **before** the job runs; execution is a background `asyncio.to_thread` (`api_server.py:6014-6021` / `6051-6058`) so a long agent turn cannot trip the caller's HTTP timeout. At-most-once is enforced by a store CAS in `claim_fire` / `claim_job_for_fire` (`api_server.py:5931-5932`, `cron/jobs.py:2805+`).

### 8.4 Live observation

`GET http://127.0.0.1:8642/api/cron/fire` returned:

```
HTTP/1.1 405 Method Not Allowed
Allow: POST
```

which proves the route **is registered** on this running instance (so `_CRON_AVAILABLE` is true here). I did not POST to it — with no `cron.chronos.*` configured the verifier would reject anyway, and it is the one inbound that can trigger job execution.

**Recommendation for the Raycast plugin: do not touch this endpoint.** Use `POST /api/jobs/{id}/run`.

---

## 9. How a job's output is delivered, and valid `destination` values

### 9.1 `deliver` is a single string field

The canonical contract, verbatim from `_normalize_deliver_value` (`cron/scheduler.py:2251-2261`):

> The contract is that `deliver` is a string (`"local"`, `"origin"`, `"telegram"`, `"telegram:-1001:17"`, or comma-separated combinations). Historically some callers — MCP clients passing an array, direct edits of `jobs.json`, or stale code paths — have stored a list/tuple like `["telegram"]`. … Flatten lists/tuples into a comma-separated string so both forms work. Returns `"local"` for anything falsy.

So a client should always send a **string**. Lists are tolerated by the scheduler but not by everything else.

### 9.2 Grammar of `deliver`

Resolution: `_resolve_delivery_targets` (`cron/scheduler.py:2296-2331`) splits on `,`, expands routing tokens, then `_resolve_single_delivery_target` (`cron/scheduler.py:2148-2239`) resolves each part:

| Value | Meaning |
|---|---|
| `"local"` | no delivery; output is only persisted. `_resolve_delivery_targets` short-circuits to `[]` (`cron/scheduler.py:2307-2308`), `_resolve_single_delivery_target` returns `None` (`cron/scheduler.py:2153-2154`), and `_deliver_result` returns `None` — explicitly *not* an error (`cron/scheduler.py:2524-2525`). |
| `"origin"` | deliver back to the `origin` `{platform, chat_id}` recorded on the job. If no origin resolves, falls back to the first platform with a configured home channel; if none, delivery is skipped silently (`cron/scheduler.py:2156-2177`, `2527-2537`). |
| `"all"` | routing token — expands at **fire time** to every platform that has a configured home chat_id (`_ROUTING_TOKENS`, `cron/scheduler.py:2275`; `_expand_routing_tokens`, `2278-2293`). |
| `"<platform>"` | that platform's configured home channel (`cron/scheduler.py:2223-2247`). |
| `"<platform>:<chat_id>"` | explicit channel; loses thread/topic targeting. |
| `"<platform>:<chat_id>:<thread_id>"` | explicit channel + thread/topic (`cron/scheduler.py:2180-2219`). |
| `"a,b,c"` | comma-combination of any of the above; duplicate `(platform, chat_id, thread_id)` tuples are deduped (`cron/scheduler.py:2317-2326`). |

The agent tool schema documents the same grammar with examples (`tools/cronjob_tools.py:1664`, the `deliver` parameter description): `'telegram:-1001234567890:17585'`, `'discord:#engineering'`, `'sms:+15551234567'`, `'all'`, `'origin,all'`.

### 9.3 Valid platform names — the literal allowlist

`cron/scheduler.py:459-464`:

```python
_KNOWN_DELIVERY_PLATFORMS = frozenset({
    "telegram", "discord", "slack", "whatsapp", "signal",
    "matrix", "mattermost", "homeassistant", "dingtalk", "feishu",
    "wecom", "wecom_callback", "weixin", "sms", "email", "webhook", "bluebubbles",
    "qqbot", "yuanbao",
})
```

Plus any plugin platform that registers a `cron_deliver_env_var` via `PlatformEntry` (`_is_known_delivery_platform`, `cron/scheduler.py:1918-1932`).

Home-channel config env var per platform (`_HOME_TARGET_ENV_VARS`, `cron/scheduler.py:468-485`) — names only. A separate `_LEGACY_HOME_TARGET_ENV_VARS` map (`cron/scheduler.py:491+`) provides back-compat fallbacks for renamed vars:

```
matrix→MATRIX_HOME_ROOM, telegram→TELEGRAM_HOME_CHANNEL, discord→DISCORD_HOME_CHANNEL,
slack→SLACK_HOME_CHANNEL, signal→SIGNAL_HOME_CHANNEL, mattermost→MATTERMOST_HOME_CHANNEL,
sms→SMS_HOME_CHANNEL, email→EMAIL_HOME_ADDRESS, dingtalk→DINGTALK_HOME_CHANNEL,
feishu→FEISHU_HOME_CHANNEL, wecom→WECOM_HOME_CHANNEL, weixin→WEIXIN_HOME_CHANNEL,
bluebubbles→BLUEBUBBLES_HOME_CHANNEL, qqbot→QQBOT_HOME_CHANNEL,
whatsapp→WHATSAPP_HOME_CHANNEL, whatsapp_cloud→WHATSAPP_CLOUD_HOME_CHANNEL
```

A platform with no configured home chat_id resolves to no target (`cron/scheduler.py:2240-2242`), so the job's output is saved but not sent, and `last_delivery_error` records `no delivery target resolved for deliver=<value>` (`cron/scheduler.py:2539-2541`).

> **HAZARD for REST-created jobs.** The API always stamps `origin = {"platform": "api_server", "chat_id": "api", …}` (§4.4). `_resolve_origin` (`cron/scheduler.py:1498-1517`) accepts any dict with both `platform` and `chat_id`, so `deliver: "origin"` on an API-created job resolves to platform `"api_server"` — which is **not** in `_KNOWN_DELIVERY_PLATFORMS` and is not a messaging transport. The actual send outcome is `UNVERIFIED` (I did not run a job), but there is no code path that turns `api_server` into a chat. **Use `deliver: "local"` (the REST default) or an explicit platform target.**

### 9.4 What is actually delivered

`_deliver_result` (`cron/scheduler.py:2510+`):

* By default the content is **wrapped**, unless `cron.wrap_response: false` in `config.yaml` (`cron/scheduler.py:2546-2555`). The literal wrapper (`cron/scheduler.py:2557-2566`):

```
Cronjob Response: {task_name}
(job_id: {job_id})
-------------

{content}

To stop or manage this job, send me a new message (e.g. "stop reminder {task_name}").
```

* `MEDIA:` tags in the output are extracted and sent as native attachments rather than raw text (`cron/scheduler.py:2570-2599`, routing in `_send_media_via_adapter`, `cron/scheduler.py:2341+`). Files rejected by the media-path policy are recorded as delivery errors instead of being silently dropped.
* When the gateway is running, live adapters are used first (needed for E2EE/relay-fronted platforms); otherwise a standalone send path is used (`cron/scheduler.py:2513-2518`).
* Output is **always** persisted regardless of delivery: `save_job_output` writes `<HERMES_HOME>/cron/output/<job_id>/<YYYY-MM-DD_HH-MM-SS>.md` (`cron/jobs.py:3521-3549`), pruned to a bounded count (`_cron_output_keep`, `cron/jobs.py:3481`).
* Optionally the output can also be mirrored into the target chat's session transcript — per-job `attach_to_session`, else global `cron.mirror_delivery`, default **off** (`_cron_mirror_delivery_enabled`, `cron/scheduler.py:1520-1543`).

There is **no REST endpoint that returns job output.** A Raycast plugin can only surface `last_status` / `last_error` / `last_delivery_error` / `latest_execution`, or read the `.md` files off disk directly.

### 9.5 Which scheduler is actually firing jobs

`resolve_cron_scheduler` (`cron/scheduler_provider.py:429-465`) reads config key `cron.provider`; empty/absent → the built-in `InProcessCronScheduler` (`cron/scheduler_provider.py:491+`). The built-in ticker runs inside the gateway process every `TICKER_INTERVAL_SECONDS = 60` (`cron/jobs.py:99`). Heartbeat files: `<cron>/ticker_heartbeat` (`TICKER_HEARTBEAT_FILE`, `cron/jobs.py:91`) and `<cron>/ticker_last_success` (`TICKER_SUCCESS_FILE`, `cron/jobs.py:94`).

### 9.6 Terminal behaviour after runs

`_mark_job_run_locked` (`cron/jobs.py:2398-2544`):
* `repeat.times` reached → `enabled=false`, `state="completed"`, `next_run_at=null`; the record is **retained** (not deleted) so the outcome stays inspectable (`cron/jobs.py:2492-2507`, assignments at `2503-2505`). A retention sweep prunes these later after `COMPLETED_ONESHOT_RETENTION_DAYS`.
* One-shot completed → same terminal shape (`cron/jobs.py:2535-2537`).
* A **recurring** job whose next run cannot be computed (e.g. croniter missing) is left `enabled` with `state="error"` and a `last_error` explaining it — deliberately never silently disabled (`cron/jobs.py:2518-2534`).

---

## 10. Timezone handling and `next_run_at`

### 10.1 There is no per-job timezone

Nothing in the job record carries a timezone. All cron time math goes through one clock: `hermes_time.now()`, imported as `_hermes_now` (`cron/jobs.py:41`).

`hermes_time.py` resolution order (docstring, `hermes_time.py:1-13`, implementation `_resolve_timezone_name`, `hermes_time.py:37-79`):

1. `HERMES_TIMEZONE` environment variable (`hermes_time.py:44-46`);
2. the `timezone` key in `<HERMES_HOME>/config.yaml` (`hermes_time.py:73-75`, with a managed-scope overlay applied, `hermes_time.py:66-72`);
3. otherwise the server's local time via `datetime.now().astimezone()` (`hermes_time.py:133`).

The resolved zone is cached process-wide (`get_timezone`, `hermes_time.py:96-106`); `reset_cache()` forces re-resolution (`hermes_time.py:109-119`). An invalid IANA name logs a warning and falls back — it never crashes (`_get_zoneinfo`, `hermes_time.py:82-93`).

Practical consequence for a client: **timestamps come back as ISO 8601 strings with an explicit UTC offset** matching the agent's configured zone. Observed on the real local store: `"2026-08-10T07:37:52.491096-03:00"` (offset `-03:00`). Parse the offset; do not assume UTC and do not assume the plugin host's zone matches.

### 10.2 `compute_next_run` (`cron/jobs.py:1031-1089`)

```python
now = _hermes_now()
```

* `kind == "once"` → `_recoverable_oneshot_run_at` (`cron/jobs.py:838-865`): returns the stored `run_at` **only** if the job has never run (`last_run_at` falsy) and `run_at >= now - 120s`; otherwise `None`.
* `kind == "interval"` → `last_run_at + minutes` if a last run exists, else `now + minutes`. Note: on a brand-new interval job the **first** run is `now + interval`, not immediately.
* `kind == "cron"` → `croniter(expr, base_time).get_next(datetime)` where `base_time` is `last_run_at` when available, else `now` — deliberately anchored to the last actual execution so a restart doesn't shift the schedule (`cron/jobs.py:1076-1085`). Returns `None` (with a warning) when croniter isn't installed.

Return value is always `datetime.isoformat()` — i.e. tz-aware ISO with offset — or `None`.

### 10.3 Legacy/naive and DST handling

* `_ensure_aware` (`cron/jobs.py:794-810`): a stored naive timestamp is interpreted as **system-local** wall time, then converted to the configured Hermes zone. Aware timestamps are just converted.
* `_timezone_offset_mismatch` (`cron/jobs.py:813-822`) and `_stored_wall_clock_is_future` (`cron/jobs.py:825-835`) exist so that a change of configured timezone doesn't make a future wall-clock run look due — cron intent is treated as local wall-clock intent.
* Catch-up vs fast-forward for missed runs: `_compute_grace_seconds` (`cron/jobs.py:868-900`) = half the schedule period clamped to `[120 s, 7200 s]`.

### 10.4 What to display

* `schedule_display` — the human string (`"every 30m"`, `"0 9 * * *"`, `"once at 2026-06-01 09:00"`), always present after normalization, `"?"` when nothing resolves (`cron/jobs.py:512-527`).
* `next_run_at` — may be `null` for terminal/completed jobs and for paused jobs whose schedule was edited.
* `state` — already derived for display; do not recompute from `enabled` alone. In particular `effective_job_state` guarantees a job with `enabled: true` never displays as `paused` (`cron/jobs.py:585-603`).

---

## 11. Error catalogue (and the 500 wart)

| Status | Where | Literal body |
|---|---|---|
| 400 | create/patch validation | `{"error": "Name is required"}` / `{"error": "Name must be ≤ 200 characters"}` / `{"error": "Schedule is required"}` / `{"error": "Prompt must be ≤ 5000 characters"}` / `{"error": "Repeat must be a positive integer"}` / `{"error": "No valid fields to update"}` |
| 400 | bad id | `{"error": "Invalid job ID format"}` |
| 400 | prompt scan | `{"error": "Blocked: prompt matches threat pattern '<id>'. …"}` |
| 400 | cron fire | `{"error": "missing job_id"}` |
| 401 | all jobs routes | `{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}` |
| 401 | cron fire | `{"error": "invalid fire token"}` |
| 404 | get/patch/delete/pause/resume/run | `{"error": "Job not found"}` |
| 424 | create, registration failed | `{"error": "…", "job_id": "…", "job_saved": true, "scheduler_registered": false, "retry_create": false}` |
| 501 | any jobs route, cron module missing | `{"error": "Cron module not available"}` |
| 503 | run / cron fire while draining | `{"error": {"message": "Gateway is draining existing work; retry shortly.", "type": "invalid_request_error", "param": null, "code": "gateway_draining"}}` + `Retry-After: 1` |
| 503 | cron fire, claim failed | `{"error": "cron fire admission failed", "job_id": "…"}` |
| **500** | **everything else** | `{"error": "<redacted exception text>"}` |

Every jobs handler ends with `except Exception as e: return web.json_response({"error": _redact_api_error_text(e)}, status=500)` — the eight `return` lines are `api_server.py:5727`, `5782`, `5801`, `5839`, `5859`, `5879`, `5899`, `5921`. `_redact_api_error_text` (`api_server.py:1083-1088`) runs `redact_sensitive_text(str(value), force=True)`.

**Practical consequence — this is the single biggest UX trap:** an invalid schedule string does **not** return 400. `parse_schedule`'s `ValueError` propagates out of `create_job` into the generic handler, so:

```
POST /api/jobs {"name":"x","schedule":"tomorrow at 9","prompt":"hi"}
→ 500 {"error": "Invalid schedule 'tomorrow at 9'. Use:\n  - Duration: '30m', '2h', '1d' (one-shot)\n  - Interval: 'every 30m', 'every 2h' (recurring)\n  - Cron: '0 9 * * *' (cron expression)\n  - Timestamp: '2026-02-03T14:00:00' (one-shot at time)"}
```

(Status/plumbing traceable to `api_server.py:5777` + `5781-5782`; the exact 500 body was not produced by a live POST — **UNVERIFIED** as a literal wire capture, but the message text is verbatim from `cron/jobs.py:785-791`.)

The same applies to: past-dated one-shots at create (`cron/jobs.py:1943-1946`), past-dated one-shots on PATCH (`cron/jobs.py:2161-2167`), un-resumable one-shots (`cron/jobs.py:2221-2224`), malformed JSON bodies, and the `repeat`-as-int hazard in §6.2. **A client should validate the schedule string locally before POSTing**, and should surface a 500 whose body mentions "Invalid schedule" as a user-level validation error rather than a server crash.

---

## 12. Notes for the Raycast implementation

1. **Base URL** `http://127.0.0.1:8642`, header `Authorization: Bearer <API_SERVER_KEY>`. Never log or display the key.
2. **List** with `?include_disabled=true`, otherwise paused jobs vanish from the UI.
3. **Detail view**: use `GET /api/jobs/{id}`; remember `latest_execution` is list-only, so keep the list payload if you want execution state on the detail screen.
4. **Create form fields** should be exactly: `name` (required, ≤200), `schedule` (required, string, validate client-side against §5), `prompt` (≤5000), `deliver` (default `"local"`), `skills` (string array), `repeat` (int ≥ 1, optional).
5. **Edit form** may send only `{name, schedule, prompt, deliver, skills, skill, enabled}` — and should deliberately **omit `repeat`** (§6.2 hazard).
6. **Pause/resume toggle**: POST to `/pause` and `/resume`; **never** PATCH `enabled:false` as a pause. PATCH only whitelists `enabled` — it does not touch `state` or `paused_at` — so the record ends up `enabled: false` with `state` still `"scheduled"`. Trace `effective_job_state` (`cron/jobs.py:595-598`): the `not enabled` branch returns `"paused"` only if `_has_pause_marker(job)` or the stored state is already `"paused"`; otherwise it falls through to `return stored or "paused"`, and a stored `"scheduled"` is truthy, so **it returns `"scheduled"`**. Net effect: a PATCH-disabled job reports `state: "scheduled"` while `is_job_runnable` (`cron/jobs.py:578-579`) refuses to fire it — a silently dead job. Use `/pause`, which sets `enabled`, `state` and `paused_at` together.
7. **"Run now"** must be labelled as *queue for next tick* — it can take up to ~60 s and requires a live gateway ticker.
8. **Client-side schedule validator** worth implementing verbatim from §5: `^every\s+\d+\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$` | 5+ fields each matching `^[\d\*\-,/]+$` | ISO-8601 | bare duration.
9. **Never** call `/api/cron/fire`.

---

## 13. Explicitly UNVERIFIED

* No live authenticated call was made to any `/api/jobs*` route (the API key was deliberately not read), so all 200-level bodies in this document are reconstructed from source + tests, not captured from the wire. The 401 bodies, the 405 on `/api/cron/fire`, and the `/health` body **are** live captures.
* The literal 500 body for an invalid schedule was not captured on the wire; only the exception text is verbatim from source.
* The `repeat`-as-int PATCH crash (§6.2) is code-traceable but was not executed.
* `deliver: "origin"` behaviour for an API-created job (platform `api_server`) was not executed end-to-end (§9.3).
* Whether `POST /api/jobs/{id}/run` propagates promptly under an external (chronos) provider — the local install uses the built-in ticker, so this was not exercised.
* Plugin-registered delivery platforms beyond `_KNOWN_DELIVERY_PLATFORMS` were not enumerated on this machine.
* **UNVERIFIED:** the `latest_execution` example body in §3.2 is assembled from the SQLite column list — no real row was read out of `executions.db`. Column names and the `status` CHECK set are source-exact; the values are illustrative.
* **UNVERIFIED:** §12.6's claim that a PATCH-disabled job keeps `state: "scheduled"` is read off `effective_job_state` (`cron/jobs.py:592-602`) — it was not exercised against a live PATCH, since that requires an authenticated write.

### 13.1 Fact-check pass (adversarial re-verification)

This document was re-audited line-by-line against the sources. Corrected in that pass: a wrong claim that PATCH `enabled:false` renders as `"paused"` (§12.6 — it renders as `"scheduled"`); "the other four" origin fields (there are five, §4.4); an invented `"source": "ticker"` execution value (real values are `direct` / `builtin` / provider name, §3.2); `"local"` returning `[]` attributed to the wrong function (§9.2); and roughly twenty line citations that were off by 1-6 lines or pointed at a comment instead of the code — including `_FIRE_PURPOSE` (`verify.py:29`, not `:31`), the `{**job, **updates}` merge (`cron/jobs.py:2105`, not `:2113`), `fire_claim` clearing (`cron/jobs.py:2464`, not `:2467`), and the cron-fire `missing job_id` return (`api_server.py:5982`, not `:5977`). The §5.1 display-normalization note and the §3.1 note about the missing `include_disabled` filtering test are new. All live probes in §1.3, §1.4 and §8.4 were re-run and reproduce exactly as recorded.
