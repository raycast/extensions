# Hermes API Server — Authentication, Configuration & Auto-Discovery

**Research date:** 2026-08-19
**Hermes Agent version (live):** `0.20.4` (observed in `GET /health`)
**Source root (read-only reference):** `C:\Users\<usuario>\AppData\Local\hermes\hermes-agent`
**Primary file:** `gateway\platforms\api_server.py` (7638 lines)
**Live server probed:** `http://127.0.0.1:8642` (api_server) and `http://127.0.0.1:8644` (webhook)

> **Method / trust level.** Every claim below is either (a) cited to `file:line` in the local
> Hermes source, or (b) a literal transcript of an HTTP response or file read observed on this
> machine on 2026-08-19. Anything not verifiable is explicitly marked **UNVERIFIED**.
> No secret value is reproduced anywhere in this document — only paths and key *names*.
>
> **Paths anonymized.** Before this repository was made public, the Windows account name in home
> paths was replaced by `<usuario>` — so `C:\Users\<usuario>\AppData\Local\hermes`. That is the
> only edit applied to the literal transcripts below; everything else is verbatim.
>
> **Adversarial fact-check pass, 2026-08-19.** Every `file:line` citation below was re-opened
> against the on-disk source and the live server was re-probed. Corrected in this pass: the
> `.env`-parser citations in §2.7 (pointed at the wrong function *and* the wrong parse
> primitive), the `_check_auth` call-site count in §1.1 (`~40` → exactly `30`), the
> "only unauthenticated route" claim in §1.1 (`/v1/health` is an equal alias), `"model"` in
> §6.3 (not a literal), the `gateway_running` / `updated_at` citations in §6.2, the
> `_PORT_BINDING_PLATFORM_PORTS` and `_PLATFORM_DEAD_STATES` line numbers, and roughly a dozen
> off-by-one line ranges. Live re-probe confirmed `/health` (200, `Content-Length: 65`),
> `/v1/health` (identical body), `/v1/models` unauthenticated (401, `Content-Length: 127`,
> exact body as in §1.4), `Origin:` → bare 403, and `:8644/health` → `"platform": "webhook"`.

---

## 0. TL;DR for the Raycast implementer

| Question | Answer |
|---|---|
| Auth scheme | `Authorization: Bearer <API_SERVER_KEY>` — **the only accepted form** |
| Where the key lives on this machine | `C:\Users\<usuario>\AppData\Local\hermes\.env`, line 478, key name `API_SERVER_KEY` |
| Config file | `C:\Users\<usuario>\AppData\Local\hermes\config.yaml` (verified to exist) |
| Config key path for port/host | `platforms.api_server.extra.port` / `platforms.api_server.extra.host` |
| Config key path for the key | `platforms.api_server.extra.key` (**absent** in this install — key comes from `.env`) |
| Default bind | `127.0.0.1:8642` (`DEFAULT_HOST`/`DEFAULT_PORT`, `api_server.py:151-152`) |
| Live bind (observed) | `127.0.0.1:8642`, **IPv4 only** — `::1` is *not* listening |
| Health probe (no auth) | `GET /health` → `{"status": "ok", "platform": "hermes-agent", "version": "0.20.4"}`. `GET /v1/health` is an exact alias (same handler, `api_server.py:2060`/`:2062`) — these two are the *only* unauthenticated routes. |
| 401 body | `{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}` |
| CORS gotcha | **Never send an `Origin` header.** Any request with `Origin` gets a bare **403** (empty body) before auth, because `cors_origins` is unset. Node `fetch` does not send `Origin` by default — leave it that way. |
| Discovery gotcha | Nothing on disk records the *live* api_server port. `config.yaml` is the authoritative declared value; probing `127.0.0.1:8642` + validating `/health` is the reliable runtime check. |
| Port 8644 gotcha | 8644 is the **webhook** adapter, not the API server. Its `/health` returns `{"status": "ok", "platform": "webhook"}` — you MUST check `platform === "hermes-agent"`. |

---

## 1. Authentication

### 1.1 The check itself — `_check_auth`

Source: `gateway\platforms\api_server.py:1782-1834`.

```python
    def _check_auth(self, request: "web.Request") -> Optional["web.Response"]:
        """
        Validate Bearer token from Authorization header.

        Returns None if auth is OK, or a 401 web.Response on failure.
        connect() refuses to start the API server without API_SERVER_KEY, so
        the no-key branch only exists for tests or unsupported manual wiring.
        """
        profile = _api_request_profile.get()
        is_named_profile = bool(profile and profile != "default")
        expected_key = self._expected_api_key()
        if not expected_key:
            # Preserve the historical no-key test/manual-wiring behavior only
            # for the default listener. Named profiles must fail closed rather
            # than inherit the listener owner's key.
            if not is_named_profile:
                return None
            ...
            return web.json_response({...}, status=401)

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            if hmac.compare_digest(token.encode(), expected_key.encode()):
                return None  # Auth OK
        ...
        return web.json_response({...}, status=401)
```

**Behavioral facts derived from that code:**

1. **Only `Bearer` is accepted.** `api_server.py:1816-1817` — the header must literally
   `startswith("Bearer ")` (capital B, capital r, single trailing space). There is **no**
   support for `X-Api-Key`, `Api-Key`, `Token`, Basic auth, a `?api_key=` query parameter,
   or a cookie. Grep of every `request.headers.get(` site (§8) confirms `Authorization` is the
   only auth-bearing header the api_server reads for `API_SERVER_KEY`.
2. **The prefix match is case-sensitive.** `"bearer xyz"` will NOT match and yields 401.
3. The token is `.strip()`ed after the 7-char prefix (`api_server.py:1818`), so trailing
   whitespace/newlines in the header value are tolerated.
4. Comparison is timing-safe via `hmac.compare_digest`, on **bytes** — both sides are
   `.encode()`d specifically so a non-ASCII byte in the client header returns a clean 401
   instead of a `TypeError` → 500 (`api_server.py:1819-1826`; the rationale is in the comment
   at 1819-1824, the compare itself is at 1825).
5. `_check_auth` is called at the top of essentially every handler — `grep -c '_check_auth(request)'`
   returns exactly **30** call sites (`api_server.py:1120, 3003, 3062, 3111, 3147, 3238, 3266,
   3394, 3436, 3550, 3560, 3607, 3620, 3679, 4124, 5653, 5666, 5716, 5731, 5786, 5805, 5843,
   5863, 5883, 5903, 7091, 7106, 7158, 7246, 7306`). One of those (line 1120) is inside the
   `_admit_api_agent_request` decorator (`api_server.py:1108-1137`), which covers the
   agent-serving routes, so 30 call sites cover all 41 registered routes.
   **The only routes with no `API_SERVER_KEY` auth are `GET /health` and its alias
   `GET /v1/health`** — both map to the same `_handle_health` (`api_server.py:2990-2994`;
   routes registered at `2060` and `2062`). Two further routes bypass `_check_auth` but use a
   *different* verifier (see §1.5), so "unauthenticated" applies only to the two health routes.

### 1.2 Profile-scoped expected key — `_expected_api_key`

Source: `api_server.py:1758-1780`.

```python
    def _expected_api_key(self) -> str:
        """Return the API key authorized for the URL-selected profile."""
        profile = _api_request_profile.get()
        if not profile or profile == "default":
            return self._api_key

        try:
            from agent.secret_scope import get_secret
            from hermes_cli.auth import has_usable_secret

            key = get_secret("API_SERVER_KEY", "") or ""
            if not has_usable_secret(key, min_length=16):
                return ""
            return key
        except Exception as exc:
            # Fail closed ...
            return ""
```

- For the default listener (no `/p/<profile>/` prefix, or multiplexing off), the expected key
  is the adapter's `self._api_key` captured at construction (`api_server.py:1383`).
- For a **named profile** (`/p/<name>/…` with multiplexing on), the key is re-resolved through
  the profile secret scope and must pass `has_usable_secret(..., min_length=16)`.
- Any exception → returns `""` → fail closed (named profiles 401).

### 1.3 What happens when NO key is configured at all

- **Runtime request path:** `api_server.py:1793-1798`. If `expected_key` is empty **and** the
  request is on the default (unprefixed) listener, `_check_auth` returns `None` — i.e. the
  request is **allowed through unauthenticated**. If a `/p/<profile>/` prefix selected a named
  profile, it returns 401 instead.
- **But this is unreachable in practice**, because the adapter refuses to start without a key.
  `_api_key_passes_startup_guard` (`api_server.py:7388-7426`) is called first thing in
  `connect()` (`api_server.py:7437`):
  - empty key → `logger.error(... "Refusing to start: API_SERVER_KEY is required ...")` → `False`
  - `has_usable_secret` import failure → fail CLOSED → `False`
  - `has_usable_secret(self._api_key, min_length=16)` false (placeholder or <16 chars) → `False`
  On failure it sets a **non-retryable** fatal error `api_server_key_invalid`
  (`api_server.py:7449-7456`) so the reconnect watcher drops it.
- **Load-time gate too:** `gateway/config.py:867-881` `_has_usable_api_server_key()` mirrors the
  same `min_length=16` bar, and `gateway/config.py:2212` only enrolls the platform at all when
  the key passes it. `gateway/config.py:891-893` makes `_PLATFORM_CONNECTED_CHECKERS[API_SERVER]`
  depend on `cfg.extra.get("key")`.
- `has_usable_secret` (`hermes_cli/auth.py:665-675`) rejects non-strings, anything shorter than
  `min_length`, and any value in `_PLACEHOLDER_SECRET_VALUES` (`hermes_cli/auth.py:649-663`:
  `*`, `**`, `***`, `changeme`, `your_api_key`, `your_api_key_here`, `your-api-key`,
  `placeholder`, `example`, `dummy`, `null`, `none` — compared lowercased).

> **Practical consequence for Raycast:** you can safely assume that if `/health` answers with
> `"platform": "hermes-agent"`, a key IS configured and IS required for every other route.

### 1.4 Exact 401 response bodies (literal)

There are **two** distinct `web.json_response(..., status=401)` returns in `_check_auth`, and
they emit byte-identical JSON payloads.

**(a)** Named-profile-with-no-scoped-key branch — `api_server.py:1805-1814`:

```json
{
  "error": {
    "message": "Invalid gateway API key (API_SERVER_KEY)",
    "type": "gateway_auth_error",
    "code": "gateway_auth_failed"
  }
}
```

**(b)** Invalid/missing bearer branch — `api_server.py:1832-1835`:

```python
        return web.json_response(
            {"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}},
            status=401,
        )
```

**Observed live** (2026-08-19), for both "no Authorization header" and "wrong Bearer token",
on `/v1/models` and on `/health/detailed`:

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
Content-Length: 127
Server: Python/3.11 aiohttp/3.14.3

{"error": {"message": "Invalid gateway API key (API_SERVER_KEY)", "type": "gateway_auth_error", "code": "gateway_auth_failed"}}
```

Note the wire format uses `": "` and `", "` separators (aiohttp's default `json.dumps`),
`Content-Length: 127`. There is **no** `WWW-Authenticate` header.

**Error-code table for a Raycast client:**

| HTTP | `error.code` | `error.type` | Meaning |
|---|---|---|---|
| 401 | `gateway_auth_failed` | `gateway_auth_error` | Missing/invalid Bearer key. Not retryable — reprompt for the key. |
| 403 | *(empty body, no JSON)* | — | CORS: an `Origin` header was sent and is not allowlisted. Remove the header. |
| 403 | *(no `code`)* | `invalid_request_error` | `X-Hermes-Session-Id` or `X-Hermes-Session-Key` sent while `self._api_key` is falsy (`api_server.py:4246-4252`, `2143-2154`). |
| 404 | *(`{"error": "Unknown or unconfigured profile"}`)* | — | `/p/<profile>/` prefix names a profile this gateway doesn't serve (`api_server.py:2039-2043`). |
| 413 | `body_too_large` | `invalid_request_error` | > `MAX_REQUEST_BYTES` = 10,000,000 (`api_server.py:154`, `1163-1186`). |
| 400 | `invalid_content_length` | `invalid_request_error` | Non-integer `Content-Length` (`api_server.py:1173-1174`). |
| 429 | `rate_limit_exceeded` | `rate_limit_error` | Concurrent-run cap; `Retry-After: 1` (`api_server.py:6268-6275`). |
| 503 | `gateway_draining` | `invalid_request_error` | Gateway draining; `Retry-After: 1` (`api_server.py:1559-1570`). |
| 503 | `platform_unavailable` / `platform_http_events_unsupported` | `invalid_request_error` | Platform-event callback route only. |
| 500 | *(none)* | `server_error` | `Internal server error: …` from `_run_agent`. |

The generic envelope helper is `_openai_error` (`api_server.py:1091-1100`) — it always emits
all four fields, so `param` and `code` may be `null`:

```json
{"error": {"message": "…", "type": "invalid_request_error", "param": null, "code": null}}
```

The `_check_auth` 401 is **not** built with `_openai_error` and therefore has **no `param`
field** — matching the literal body above. Do not write a parser that requires `param`.

Note also that `_openai_error` passes `message` through `_redact_api_error_text(...)`
(`api_server.py:1095`), so `error.message` may be a redacted form of the internal text. Key
off `error.code` / `error.type`, never off the message string.

### 1.5 Auth on routes that do NOT use `API_SERVER_KEY`

Two ingress routes deliberately bypass `_check_auth`:

- `POST /api/platforms/{platform}/events` — verified by the *target adapter's* own verifier
  reading `Authorization` (`api_server.py:1907`, dispatch at `1908-1928`). 401 body is
  `_openai_error("Invalid platform event authorization", code=<verifier code> or "invalid_platform_event_authorization")`.
- `POST /api/cron/fire` — verified by a NAS-minted JWT (`api_server.py:5938-5939`:
  `auth = request.headers.get("Authorization", "")`; `token = auth[7:].strip() if auth.startswith("Bearer ") else ""`),
  registered only when `_CRON_AVAILABLE` (`api_server.py:2101-2104`).

Neither is useful to a Raycast extension; listed for completeness.

---

## 2. Where `API_SERVER_KEY` comes from

### 2.1 Adapter construction

`api_server.py:1383`:

```python
        self._api_key: str = extra.get("key", _get_scoped_secret("API_SERVER_KEY", ""))
```

So precedence at adapter construction is:

1. `config.extra["key"]` — i.e. the resolved gateway `PlatformConfig.extra` dict.
2. otherwise `_get_scoped_secret("API_SERVER_KEY", "")`.

`_get_scoped_secret` (`api_server.py:103-121`) calls `agent.secret_scope.get_secret`, and on
`UnscopedSecretError` falls back to `os.getenv(name)`.

### 2.2 `agent/secret_scope.py::get_secret`

Source: `agent/secret_scope.py:132-186`. Resolution order:

1. If the name is a "global env" name → straight `os.environ`. **`API_SERVER_KEY` is explicitly
   NOT in that list.** `agent/secret_scope.py:108-116` includes `API_SERVER_ENABLED`,
   `API_SERVER_HOST`, `API_SERVER_PORT`, `API_SERVER_CORS_ORIGINS` — with the comment
   *"NOTE: API_SERVER_KEY is deliberately NOT here — it IS a credential and stays profile-scoped."*
2. If a secret scope contextvar is installed → read from it; on a miss, return `default`
   when multiplexing is ACTIVE, else fall through to `os.environ`.
3. No scope installed: multiplex inactive → `os.environ`; multiplex active → raise
   `UnscopedSecretError`.

### 2.3 How the value gets into `os.environ` in the first place

The gateway loads the profile `.env` at import time:
`gateway/run.py:1970-1972`

```python
from hermes_cli.env_loader import load_hermes_dotenv
_env_path = _hermes_home / '.env'
load_hermes_dotenv(hermes_home=_hermes_home, project_env=Path(__file__).resolve().parents[1] / '.env')
```

The same is done by the CLI entrypoint (`hermes_cli/main.py:697,706`).
`hermes_cli/config.py:3913-3953` (`load_env`) reads `<HERMES_HOME>/.env` with `utf-8-sig`
encoding and mtime-based memoisation; `hermes_cli/config.py:4415-4445`
(`get_env_value_prefer_dotenv`) prefers the `.env` file over `os.environ` for Hermes-managed
credentials.

### 2.4 Env-var → PlatformConfig bridging

`gateway/config.py:2203-2244`:

```python
    api_server_key = getenv("API_SERVER_KEY", "")
    api_server_cors_origins = getenv("API_SERVER_CORS_ORIGINS", "")
    api_server_port = getenv("API_SERVER_PORT")
    api_server_host = getenv("API_SERVER_HOST")
    if _has_usable_api_server_key(api_server_key):
        ...
        if api_server_key:
            config.platforms[Platform.API_SERVER].extra["key"] = api_server_key
        if api_server_cors_origins:
            origins = [origin.strip() for origin in api_server_cors_origins.split(",") if origin.strip()]
            if origins:
                config.platforms[Platform.API_SERVER].extra["cors_origins"] = origins
        if api_server_port:
            try:
                config.platforms[Platform.API_SERVER].extra["port"] = int(api_server_port)
            except ValueError:
                pass
        if api_server_host:
            config.platforms[Platform.API_SERVER].extra["host"] = api_server_host
```

So on a normal single-profile install the env var **wins**: it is copied into
`extra["key"]`, which `api_server.py:1383` reads first. Config YAML `platforms.api_server.extra.key`
is used when no env var is present.

### 2.5 YAML key-path bridging

`gateway/config.py:1548-1556` bridges shorthand YAML into `extra` (rationale comment at 1543-1547):

```python
            _api_plat = platforms_data.get("api_server")
            if isinstance(_api_plat, dict):
                _api_extra = _api_plat.get("extra")
                if not isinstance(_api_extra, dict):
                    _api_extra = {}
                    _api_plat["extra"] = _api_extra
                for _bridge_key in ("port", "key", "host", "cors_origins", "model_name"):
                    if _bridge_key in _api_plat and _bridge_key not in _api_extra:
                        _api_extra[_bridge_key] = _api_plat.pop(_bridge_key)
```

`gateway/config.py:1524-1541` additionally merges platform blocks written directly under
`gateway.*` (e.g. `gateway.api_server.port`).

**Therefore all of these YAML paths are equivalent and end up in `extra`:**

| YAML path | Notes |
|---|---|
| `platforms.api_server.extra.key` | canonical |
| `platforms.api_server.key` | bridged into `extra` (`gateway/config.py:1554-1556`) |
| `gateway.platforms.api_server.extra.key` | merged (`gateway/config.py:1521`) |
| `gateway.api_server.key` | merged (`gateway/config.py:1529-1541`) then bridged |

Same for `port`, `host`, `cors_origins`, `model_name`.

### 2.6 `get_config_path()` and the EXACT Windows path

`hermes_constants.py:1506-1512`:

```python
def get_config_path() -> Path:
    """Return the path to ``config.yaml`` under HERMES_HOME.
    ...
    """
    return get_hermes_home() / "config.yaml"
```

`hermes_constants.py:1521-1523`:

```python
def get_env_path() -> Path:
    """Return the path to the ``.env`` file under HERMES_HOME."""
    return get_hermes_home() / ".env"
```

`get_hermes_home()` (`hermes_constants.py:114-141`) resolution order:

1. context-local override (`get_hermes_home_override()`, `hermes_constants.py:45-51`) — in-process only, irrelevant to an external client
2. `HERMES_HOME` env var (`_hermes_home_from_env`, `hermes_constants.py:62-74`)
3. platform-native default (`_get_platform_default_hermes_home`, `hermes_constants.py:53-59`):

```python
def _get_platform_default_hermes_home() -> Path:
    """Return the platform-native default Hermes home path."""
    if sys.platform == "win32":
        local_appdata = os.environ.get("LOCALAPPDATA", "").strip()
        base = Path(local_appdata) if local_appdata else Path.home() / "AppData" / "Local"
        return base / "hermes"
    return Path.home() / ".hermes"
```

**Resolved for THIS user/machine (verified on disk):**

```
HERMES_HOME  = C:\Users\<usuario>\AppData\Local\hermes          (env var IS set; also equals the platform default)
config.yaml  = C:\Users\<usuario>\AppData\Local\hermes\config.yaml     ← EXISTS (15575 bytes, mtime 2026-08-19 16:07)
.env         = C:\Users\<usuario>\AppData\Local\hermes\.env            ← EXISTS (23370 bytes, mtime 2026-08-10 21:27)
```

The `HERMES_HOME` env var is also hard-coded into the gateway service launcher
`C:\Users\<usuario>\AppData\Local\hermes\gateway-service\Hermes_Gateway.cmd`:

```bat
set "HERMES_HOME=C:\Users\<usuario>\AppData\Local\hermes"
```

and recorded inside `gateway.pid` / `gateway.lock` as `"hermes_home"` (see §4.3).

### 2.7 Where the key actually is on THIS machine

- **File:** `C:\Users\<usuario>\AppData\Local\hermes\.env`
- **Line:** 478
- **Key name:** `API_SERVER_KEY`
- **Value:** *not reproduced.* (Observed length: 36 characters — comfortably above the
  `min_length=16` guard.)
- **Not** present in `config.yaml`: the `platforms.api_server` block there contains only
  `enabled`, `extra.host`, `extra.port` (see §3.4).
- **Not** present in `auth.json`: a key-name walk of
  `C:\Users\<usuario>\AppData\Local\hermes\auth.json` produced **no** `api_server`-related entries.

**Recommended read strategy for the Raycast extension** (in order):

1. `process.env.API_SERVER_KEY` (rare, but free).
2. Parse `<HERMES_HOME>/.env` for a line matching `/^\s*API_SERVER_KEY\s*=\s*(.*)$/m`, strip
   surrounding quotes and trailing `\r`. Two in-tree parsers to mirror:
   - `hermes_cli/config.py:3955-3964` (`load_env`) — skips blanks / `#` comments / lines with
     no `=`, strips a leading `export `, then splits with **`key, _, value = line.partition('=')`**
     (not `split`), and runs the value through `_parse_env_value`. File is read with
     `encoding="utf-8-sig", errors="replace"` (`hermes_cli/config.py:3950-3952`).
   - `hermes_cli/web_server.py:12986-12992` (`_profile_env_value`) — the simpler variant:
     `k, v = line.split("=", 1)` at `web_server.py:12990`, then
     `v.strip().strip('"').strip("'")` at `:12992`.
3. Parse `config.yaml` at `platforms.api_server.extra.key` (present only on installs that
   configured it there).
4. Fall back to a Raycast preference field the user pastes into.

`<HERMES_HOME>` for step 2/3 = `process.env.HERMES_HOME` || `path.join(process.env.LOCALAPPDATA, 'hermes')`.

---

## 3. Host / port binding

### 3.1 Constants

`api_server.py:150-154`:

```python
# Default settings
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8642
MAX_STORED_RESPONSES = 100
MAX_REQUEST_BYTES = 10_000_000  # 10 MB — accommodates long agent conversations with tool calls
```

Webhook adapter, for contrast: `gateway/platforms/webhook.py:130` — `DEFAULT_PORT = 8644`.

Cross-check table in the dashboard, `hermes_cli/web_server.py:3080-3090`:

```python
_PORT_BINDING_PLATFORM_PORTS: Dict[str, Tuple[str, int]] = {
    "webhook": ("port", 8644),
    "api_server": ("port", 8642),
    "msgraph_webhook": ("port", 8646),
    "feishu": ("webhook_port", 8765),
    "wecom_callback": ("port", 8645),
    "bluebubbles": ("webhook_port", 8645),
    "sms": ("webhook_port", 8080),
    "whatsapp_cloud": ("webhook_port", 8090),
    "line": ("port", 8646),
}
```

### 3.2 Resolution in the adapter

`api_server.py:1377-1382`:

```python
        extra = config.extra or {}
        self._host: str = extra.get("host", os.getenv("API_SERVER_HOST", DEFAULT_HOST))
        raw_port = extra.get("port")
        if raw_port is None:
            raw_port = os.getenv("API_SERVER_PORT", str(DEFAULT_PORT))
        self._port: int = _coerce_port(raw_port, DEFAULT_PORT)
```

`_coerce_port` (`api_server.py:210-215`) swallows `TypeError`/`ValueError` and returns
`DEFAULT_PORT`, so a malformed port never crashes startup.

Because `gateway/config.py:2234-2241` already copies `API_SERVER_PORT` / `API_SERVER_HOST` into
`extra`, `extra` normally already reflects the env var. The `os.getenv(...)` fallbacks inside
`__init__` are the belt-and-braces path.

### 3.3 Canonical, source-blessed resolution algorithm

`hermes_cli/web_server.py:12998-13053` (`_gateway_fire_endpoint`) documents and implements the
authoritative precedence, and is the exact algorithm an external client should mirror:

```
1. config.yaml → platforms.api_server.extra.port   (for the target profile)
2. API_SERVER_PORT                                  (process env for the active profile,
                                                     that profile's own .env otherwise)
3. 8642                                             (adapter default)
```

Host is documented there as "the adapter's loopback default" — the code hardcodes
`http://127.0.0.1:{port}` (`hermes_cli/web_server.py:13067-13069`). The docstring stating that
precedence is `hermes_cli/web_server.py:13001-13007`; the implementation is `:13035-13053`.

### 3.4 Live values on this machine (verified)

`C:\Users\<usuario>\AppData\Local\hermes\config.yaml`, lines 556-562:

```yaml
  api_server:
    enabled: true
    extra:
      host: 127.0.0.1
      port: 8642
  webhook:
    enabled: true
```

`grep '^API_SERVER' .env` → only `API_SERVER_KEY` is set. No `API_SERVER_PORT`,
`API_SERVER_HOST`, or `API_SERVER_CORS_ORIGINS`.

Actual listeners (`Get-NetTCPConnection -State Listen`):

```
LocalAddress LocalPort OwningProcess
------------ --------- -------------
::                8644         25936
0.0.0.0           8644         25936
127.0.0.1         8642         25936
```

> **Critical for Node/Raycast:** 8642 is bound to **`127.0.0.1` only**. Confirmed:
> `curl --max-time 3 "http://[::1]:8642/health"` → exit code / HTTP `000` (connection failed).
> Node 18+ `fetch("http://localhost:8642")` may resolve `localhost` to `::1` first and fail
> (`ECONNREFUSED`) even though the server is up. **Always use the literal `127.0.0.1`.**
> (The webhook on 8644 *does* bind `::`, which is why it would appear to work — another reason
> to validate `platform === "hermes-agent"`.)

### 3.5 Bind failure handling

`api_server.py:7538-7573`. `web.TCPSite(self._runner, self._host, self._port, reuse_address=False if sys.platform == "darwin" else None)`.
On `OSError` with `errno.EADDRINUSE` it sets a non-retryable fatal
`api_server_port_in_use` with message
`f"Port {self._port} already in use. Set platforms.api_server.port in config.yaml to a different value, then \`/platform resume api_server\`."`
and logs `"[%s] Could not bind %s:%d: %s. Set a different port in config.yaml: platforms.api_server.port"`.

On success (`api_server.py:7576-7579`):

```
[api_server] API server listening on http://127.0.0.1:8642 (model: hermes-agent)
```

This line goes to the gateway logger, **not** to any file the extension can rely on being
present or parseable. (Hermes log dir: `C:\Users\<usuario>\AppData\Local\hermes\logs\` — **UNVERIFIED**
whether this exact line lands there in a stable, greppable format; do not build discovery on it.)

---

## 4. AUTO-DISCOVERY — everything the extension can read

### 4.1 Summary of the search

I grepped/inspected every candidate the gateway or desktop app writes. **Result: no file on
disk records the *bound* api_server port.** The declared port lives in `config.yaml`; the
runtime state files record PID and platform *states* but not ports.

### 4.2 `%APPDATA%\Hermes\backend-ownership.json` — **does NOT contain the api_server port**

- **Path:** `C:\Users\<usuario>\AppData\Roaming\Hermes\backend-ownership.json`
- **Writer:** the Electron desktop app —
  `apps/desktop/electron/main.ts:768` defines
  `const DESKTOP_BACKEND_OWNERSHIP_PATH = path.join(app.getPath('userData'), 'backend-ownership.json')`,
  written atomically (temp + rename, mode `0o600`) by `writeBackendOwnership`
  (`apps/desktop/electron/main.ts:3079-3092`), read back at `main.ts:3266-3275`.
- **Observed contents (verbatim, 2026-08-19):**

```json
{
  "backends": [
    {
      "nonce": "a04ce2db77f87e2b8db65a0889ba509f",
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

**What this actually describes, and why it is a trap:**

- The command is `hermes_cli.main serve`, i.e. the **desktop web/JSON-RPC backend**, NOT the
  gateway's OpenAI-compatible api_server. Different process (PID 29256 vs the gateway's 25936),
  different auth (a per-launch random token, `apps/desktop/electron/main.ts:10407`
  `const token = crypto.randomBytes(32).toString('base64url')`; the same line also appears at
  `main.ts:10058` for the other spawn path), different surface.
- `--port 0` is deliberate: `apps/desktop/electron/main.ts:10084-10085` and `10408-10409`
  carry the comment *"--port 0: the OS assigns an ephemeral port; the child announces it on stdout."*
- The **resolved** ephemeral port is announced only on the child's **stdout**:
  `hermes_cli/web_server.py:19037-19042` (`ready_token` at `:19041`, the `print` at `:19042`)

```python
            _write_dashboard_ready_file(actual_port)
            ready_token = "HERMES_BACKEND_READY" if headless else "HERMES_DASHBOARD_READY"
            print(f"{ready_token} port={actual_port}", flush=True)
```

  Electron captures that pipe (`stdio: ['ignore', 'pipe', 'pipe']`, `main.ts:10127`) — an
  external process cannot.

**Conclusion: `backend-ownership.json` is useful for detecting *that* a desktop backend exists
and for the profile name, but it can NEVER give you a usable port when `--port 0` is in the
command line. Do not depend on it.** (If a future install shows a non-zero `--port N` in the
`command` string, that N is a legitimate hint — parse defensively and discard `0`.)

### 4.2b The optional ready-file side channel (`{"port": N}`)

`hermes_cli/web_server.py:18628-18664`:

```python
def _write_dashboard_ready_file(actual_port: int) -> None:
    """Optionally publish the dashboard port through an atomic ready file.
    ...
    """
    target = os.environ.get("HERMES_DESKTOP_READY_FILE")
    if not target:
        return
    ...
        payload = json.dumps({"port": int(actual_port)}, separators=(",", ":"))
    ...  # NamedTemporaryFile + fsync + os.replace  (atomic)
```

Electron chooses the path in `makeDashboardReadyFile` (`apps/desktop/electron/main.ts:2482-2487`):

```javascript
function makeDashboardReadyFile() {
  const dir = path.join(app.getPath('userData'), 'backend-ready')
  fs.mkdirSync(dir, { recursive: true })

  return path.join(dir, `dashboard-${process.pid}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.json`)
}
```

- **Would-be path:** `C:\Users\<usuario>\AppData\Roaming\Hermes\backend-ready\dashboard-<pid>-<epochms>-<12hex>.json`
- **Content shape:** `{"port":54321}`
- **Only written when `HERMES_DESKTOP_READY_FILE` is set** (`main.ts:10124`, `10488`:
  `...(readyFile ? { HERMES_DESKTOP_READY_FILE: readyFile } : {})`), which itself is gated on
  `backend.readyFile` (`main.ts:10091`, `10451`). The source comment at `main.ts:2476-2480`
  says the console-python fix means "no ready-file side channel is needed."
- **Verified on this machine: the directory `…\Roaming\Hermes\backend-ready\` does NOT exist.**
- Again: this is the **desktop `serve` port**, not the api_server port. Listed for completeness.

### 4.3 Gateway runtime/state/lock files (under `HERMES_HOME`) — no ports, but great liveness signals

Path helpers: `gateway/status.py:217-220` (`_get_pid_path` → `<HERMES_HOME>/gateway.pid`),
`:223-228` (`gateway.lock`, `_GATEWAY_LOCK_FILENAME` at `:43`), `:231-233`
(`_get_runtime_status_path` → sibling of `gateway.pid` named `_RUNTIME_STATUS_FILE`, which is
`"gateway_state.json"` at `gateway/status.py:39`). Reader: `read_runtime_status`
(`gateway/status.py:1134-1142`). Writer: `write_runtime_status` (`gateway/status.py:1038-1132`).
`_get_process_hermes_home` (`gateway/status.py:132-145`) deliberately reads only the process
`HERMES_HOME` env var / platform default (never the contextvar override).

**`C:\Users\<usuario>\AppData\Local\hermes\gateway_state.json` (verbatim, 2026-08-19):**

```json
{"pid":25936,"kind":"hermes-gateway","argv":["C:\\Users\\<usuario>\\AppData\\Local\\hermes\\hermes-agent\\hermes_cli\\main.py","gateway","run"],"start_time":178714045295,"gateway_state":"running","exit_reason":null,"restart_requested":false,"active_agents":0,"platforms":{"api_server":{"state":"connected","error_code":null,"error_message":null,"updated_at":"2026-08-19T11:54:38.458449+00:00","writer_pid":25936,"writer_start_time":178714045295},"webhook":{"state":"connected","error_code":null,"error_message":null,"updated_at":"2026-08-19T11:54:38.468761+00:00","writer_pid":25936,"writer_start_time":178714045295}},"updated_at":"2026-08-19T11:54:38.480444+00:00"}
```

→ **`platforms.api_server.state === "connected"` is a first-class "the API server is up" signal.
It contains NO port.** Dead states are `_PLATFORM_DEAD_STATES = frozenset({"fatal",
"disconnected", "stopped"})` (`hermes_cli/web_server.py:3093`).

**`C:\Users\<usuario>\AppData\Local\hermes\gateway.pid` (verbatim):**

```json
{"pid": 25936, "kind": "hermes-gateway", "argv": ["C:\\Users\\<usuario>\\AppData\\Local\\hermes\\hermes-agent\\hermes_cli\\main.py", "gateway", "run"], "start_time": 178714045295, "hermes_home": "C:\\Users\\<usuario>\\AppData\\Local\\hermes"}
```

**`C:\Users\<usuario>\AppData\Local\hermes\gateway.lock`** — byte-identical content to `gateway.pid`
in this observation.

> `gateway.pid` is the single best source of **which `HERMES_HOME` the running gateway is using**
> (`"hermes_home"` field). Use it to pick the right `config.yaml` / `.env` when profiles are in play.

**`C:\Users\<usuario>\AppData\Local\hermes\state\gateway.heartbeat`:**

```json
{"pid": 25936, "updated_at": "2026-08-19T19:31:02.880730+00:00", "monotonic": 27663.5, "start_time": 1787140473.6171312}
```

**`C:\Users\<usuario>\AppData\Local\hermes\state\gateway.lifecycle.json`:**

```json
{"phase": "running", "pid": 25936, "start_time": 1787140473.644875, "started_at": "2026-08-19T11:54:33.644874+00:00", "prior_unclean_exit": true}
```

**`C:\Users\<usuario>\AppData\Local\hermes\processes.json`:** `[]` (empty).

Caveat: `HERMES_GATEWAY_LOCK_DIR` (`gateway/status.py:236-242`) relocates only the *token-scoped
lock* directory (default `$XDG_STATE_HOME/hermes/<locks dir>`), **not** `gateway.pid` /
`gateway_state.json`, which always sit directly under `HERMES_HOME`.

### 4.4 `%APPDATA%\Hermes\connections.json` — no port for the local case

- **Path:** `C:\Users\<usuario>\AppData\Roaming\Hermes\connections.json`
- **Declared at:** `apps/desktop/electron/main.ts:764`
- **Observed contents (verbatim):**

```json
{
  "version": 2,
  "primary": "local",
  "launchMode": "primary",
  "lastUsed": "local",
  "connections": [
    {
      "id": "local",
      "kind": "local",
      "label": "This device"
    }
  ]
}
```

For **remote** connections this file carries a `url` (the desktop's remote-connection tests use
shapes like `{ id: 'spark', kind: 'remote', label: 'Spark', url: 'http://spark:8642' }` —
`apps/desktop/electron/connection-registry.test.ts:336`, `371`, `407`). For `kind: "local"`
there is no URL at all. **Not usable for local port discovery**, but it IS the right place to
detect that the user has configured a remote Hermes and to reuse that URL.

Related, `C:\Users\<usuario>\AppData\Local\hermes\desktop.json` (verbatim):

```json
{
  "locale": "pt-BR",
  "connectionMode": "local",
  "remoteUrl": "",
  "remoteApiKey": "",
  "remoteAuthMode": "auto",
  "remoteChatTransport": "auto",
  "sshChatTransport": "auto"
}
```

`remoteUrl` / `remoteApiKey` here would be populated for a remote setup — a legitimate secondary
source for base URL + key on remote-mode installs. **(On this machine both are empty strings.)**

### 4.5 Negative findings (things that do NOT exist / do NOT help)

| Candidate | Verdict |
|---|---|
| `<HERMES_HOME>\active_profile` | **Does not exist** on this machine → active profile is `default` (`hermes_cli/profiles.py:296-298`, `1922-1935`) |
| `<HERMES_HOME>\profiles\` | **Does not exist** → single-profile install (`hermes_cli/profiles.py:282`, `2484`) |
| `<HERMES_HOME>\runtime\` | Contains only `wake-word.lock` |
| `<HERMES_HOME>\platforms\` | Contains only `pairing\` |
| `<HERMES_HOME>\processes.json` | `[]` |
| `<HERMES_HOME>\gateway-starts.log` | Bare epoch timestamps, one per line. No ports. |
| `%APPDATA%\Hermes\backend-ready\` | Does not exist |
| Any `*.port` / `port.txt` / api_server-specific lock file | **None found.** No such write exists in `gateway/` or `hermes_cli/`. |
| Multiplexing (`gateway.multiplex_profiles`) | Not set in `config.yaml` → off. `/p/<profile>/` prefixes are ignored (`api_server.py:1982-1985`). |

### 4.6 THE DISCOVERY ALGORITHM (implement this)

Ordered, cheap → expensive. Every candidate must pass the **validation gate** in step V.

```
S0. Resolve HERMES_HOME:
      home = process.env.HERMES_HOME
          || (read <APPDATA>\Hermes  ... no)   ← not there; instead:
          || readJSON(path.join(LOCALAPPDATA,'hermes','gateway.pid')).hermes_home
          || path.join(process.env.LOCALAPPDATA, 'hermes')
    (LOCALAPPDATA fallback mirrors hermes_constants.py:53-59.)

S1. Liveness pre-check (optional, saves a wasted probe):
      st = readJSON(home + '\\gateway_state.json')
      alive = st?.platforms?.api_server?.state === 'connected'
      (Treat 'fatal' | 'disconnected' | 'stopped' as down. Cross-check st.pid is a
       live process if you want; also compare st.updated_at freshness.)
      NOTE: this is advisory only — never gate the whole flow on it, since a gateway
      started outside the desktop may write it late.

S2. Build the candidate port list, in priority order:
      a) User-provided Raycast preference (explicit base URL / port) — always wins.
      b) config.yaml → platforms.api_server.extra.port
         (also accept platforms.api_server.port, gateway.api_server.port,
          gateway.platforms.api_server.extra.port — all bridge to the same place;
          gateway/config.py:1521-1556)
      c) API_SERVER_PORT from process.env
      d) API_SERVER_PORT parsed out of <home>\.env
      e) 8642        ← DEFAULT_PORT, api_server.py:152
      f) 8644        ← LAST RESORT ONLY; this is the webhook default
                       (webhook.py:130). It will FAIL the validation gate.
                       Include it only so you can emit a precise error message.
      g) (optional, Windows) enumerate LISTEN sockets owned by the gateway PID
         from gateway.pid:
           Get-NetTCPConnection -State Listen |
             Where-Object OwningProcess -eq <pid> |
             Select-Object -Expand LocalPort
         then probe each. This is the only true "find the ephemeral port" path.
         Cost: one PowerShell spawn (~150-400ms). Use it only if a-e all fail.

S3. Host is ALWAYS the literal string '127.0.0.1'. Never 'localhost'.
    (8642 binds IPv4-only; 'localhost' can resolve to ::1 in Node 18+ and ECONNREFUSED.)

V.  VALIDATION GATE — for each candidate port, in order:
      GET http://127.0.0.1:<port>/health
        - no Authorization header needed
        - DO NOT set an Origin header
        - timeout 1500ms; treat ECONNREFUSED/ETIMEDOUT as "not here", continue
      Accept ONLY if:  res.ok  &&  json.status === 'ok'  &&  json.platform === 'hermes-agent'
      Reject json.platform === 'webhook'  (that's 8644 — wrong server).

S4. Once a base URL is accepted, confirm the key works:
      GET http://127.0.0.1:<port>/v1/models  with  Authorization: Bearer <key>
        200 → good; cache { baseUrl, version } for the session
        401 with code 'gateway_auth_failed' → key is wrong/stale: re-read <home>\.env,
              retry once, then surface "Hermes API key invalid" to the user
        403 with empty body → you leaked an Origin header; strip it

S5. Cache the winning baseUrl (Raycast LocalStorage) with the gateway pid+start_time
    from gateway.pid as a cache key. Invalidate and re-run S2..V whenever a request
    returns ECONNREFUSED or the pid/start_time changes.
```

**Remote mode addendum:** if `<HERMES_HOME>\desktop.json` has `connectionMode !== "local"` and a
non-empty `remoteUrl`, prefer that base URL with `remoteApiKey`, and skip the loopback scan.
Also consult `%APPDATA%\Hermes\connections.json` → `connections[]` entries with `kind: "remote"`
for a `url`.

---

## 5. CORS — and why it matters more than you'd think

### 5.1 The headers the server sends

`api_server.py:989-992`:

```python
_CORS_HEADERS = {
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
}
```

`_cors_headers_for_origin` (`api_server.py:1672-1690`):

- returns `None` if `origin` is empty **or** `self._cors_origins` is empty
- if `"*"` is configured: adds `Access-Control-Allow-Origin: *` and `Access-Control-Max-Age: 600`
- else if the exact origin is in the allowlist: adds `Access-Control-Allow-Origin: <origin>`,
  `Vary: Origin`, `Access-Control-Max-Age: 600`
- otherwise `None`

There is **no** `Access-Control-Allow-Credentials` and **no** `Access-Control-Expose-Headers`
(so a browser could not read the echoed `X-Hermes-Session-Id` — irrelevant for Node).

### 5.2 The origin gate — the real gotcha

`_origin_allowed` (`api_server.py:1692-1700`):

```python
    def _origin_allowed(self, origin: str) -> bool:
        """Allow non-browser clients and explicitly configured browser origins."""
        if not origin:
            return True

        if not self._cors_origins:
            return False

        return "*" in self._cors_origins or origin in self._cors_origins
```

`cors_middleware` (`api_server.py:997-1010`) runs **before** auth and returns a bare
`web.Response(status=403)` (empty body) when `_origin_allowed` is false — for *every* method,
not just preflight:

```python
        origin = request.headers.get("Origin", "")
        cors_headers = None
        if adapter is not None:
            if not adapter._origin_allowed(origin):
                return web.Response(status=403)
            cors_headers = adapter._cors_headers_for_origin(origin)

        if request.method == "OPTIONS":
            if cors_headers is None:
                return web.Response(status=403)
            return web.Response(status=200, headers=cors_headers)
```

**Live confirmation on this machine** (`cors_origins` unset):

```
curl -H "Origin: http://localhost:3000" http://127.0.0.1:8642/health           → 403
curl                                     http://127.0.0.1:8642/health           → 200
curl -X OPTIONS -H "Origin: https://example.com" …/v1/chat/completions          → 403 (Content-Length: 0)
```

**Verdict for Raycast:** Raycast extensions run in **Node**, so CORS enforcement does not apply
client-side — **confirmed, CORS is irrelevant as a browser policy.** BUT the server-side origin
gate is real and it is a hard 403 before auth. **Therefore: never attach an `Origin` header to a
Hermes request.** Node's `undici` `fetch` does not add one unless you do. Do not copy a browser
`fetch` snippet that sets `mode`/`Origin`. If you ever see an unexplained empty-body 403, this
is the cause.

(To make browser clients work an operator would set `API_SERVER_CORS_ORIGINS=<csv>` or
`platforms.api_server.extra.cors_origins: [...]` — `api_server.py:1384-1386`,
`gateway/config.py:2230-2233`. Not needed here.)

### 5.3 Security headers on every response

`_SECURITY_HEADERS` (`api_server.py:1188-1196`), applied by `security_headers_middleware`
(`api_server.py:1201-1206`) via `setdefault` on **all** responses including errors:

```python
_SECURITY_HEADERS = {
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",
    "Referrer-Policy": "no-referrer",
}
```

Middleware order at `api_server.py:7461-7471`: profile-prefix → cors → body-limit → security-headers.

---

## 6. Health endpoints

### 6.1 `GET /health` (and its alias `GET /v1/health`)

Handler `api_server.py:2990-2994`:

```python
    async def _handle_health(self, request: "web.Request") -> "web.Response":
        """GET /health — simple health check."""
        return web.json_response(
            {"status": "ok", "platform": "hermes-agent", "version": _hermes_version()}
        )
```

Routes: `api_server.py:2060` (`/health`) and `:2062` (`/v1/health`). **No `_check_auth`.**

**Observed live response (verbatim, 2026-08-19):**

```
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: no-referrer
Content-Length: 65
Server: Python/3.11 aiohttp/3.14.3

{"status": "ok", "platform": "hermes-agent", "version": "0.20.4"}
```

`_hermes_version()` (`api_server.py:126-147`) prefers `hermes_cli.__version__`, falling back to
installed dist metadata, then the literal string `"dev"`.

**For contrast, the webhook adapter on 8644 (observed):**

```
HTTP/1.1 200 OK
Content-Length: 39

{"status": "ok", "platform": "webhook"}
```

→ this is exactly why the validation gate must assert `platform === "hermes-agent"`.

### 6.2 `GET /health/detailed`

Handler `api_server.py:2996-3052`. **Requires auth** (`_check_auth` at `api_server.py:3003`).
Shape is built from `gateway/status.py` helpers + `collect_runtime_readiness`
(`gateway/readiness.py:89-119`, checks: `state_db`, `config`, `model`, `disk`, `gateway`,
`background_queues`; overall `"ok"` iff all checks are `"ok"` else `"degraded"`).

**Observed live response (verbatim, pretty-printed, 2026-08-19):**

```json
{
    "status": "ok",
    "readiness": {
        "status": "ok",
        "checks": {
            "state_db": {"status": "ok"},
            "config": {"status": "ok"},
            "model": {"status": "ok"},
            "disk": {"status": "ok", "used_percent": 81.3, "free_bytes": 95788298240},
            "gateway": {"status": "ok", "state": "running", "connected_platforms": 2, "platforms": 2},
            "background_queues": {"status": "ok", "active_api_runs": 0, "process_completions": 0, "active_delegations": 0}
        }
    },
    "platform": "hermes-agent",
    "version": "0.20.4",
    "gateway_state": "running",
    "platforms": {
        "api_server": {
            "state": "connected",
            "error_code": null,
            "error_message": null,
            "updated_at": "2026-08-19T11:54:38.458449+00:00",
            "writer_pid": 25936,
            "writer_start_time": 178714045295
        },
        "webhook": {
            "state": "connected",
            "error_code": null,
            "error_message": null,
            "updated_at": "2026-08-19T11:54:38.468761+00:00",
            "writer_pid": 25936,
            "writer_start_time": 178714045295
        }
    },
    "active_agents": 0,
    "gateway_busy": false,
    "gateway_drainable": true,
    "exit_reason": null,
    "updated_at": "2026-08-19T11:54:38.480444+00:00",
    "pid": 25936
}
```

Contract notes from source:
- `updated_at` is RFC3339 string **or null**, never a number (contract comment
  `api_server.py:3049-3050`, emitted at `:3051` via `normalize_updated_at` from
  `gateway/status.py`).
- `readiness.checks.*` deliberately expose **status + counts only** — never config values,
  credentials, paths, commands, queue payloads, or exception messages
  (`gateway/readiness.py:99-101`). Note `_probe_*` failure paths do surface the exception
  **class name** (e.g. `gateway/readiness.py:45`, `:58`, `:68`), not its message.
- `gateway_running` is hardcoded `True` because the endpoint is served *by* the gateway —
  rationale comment at `api_server.py:3018-3020`, the literal `gateway_running=True` arguments
  at `api_server.py:3040` and `:3045`.
- `readiness.status` is `"ok"` iff every check is `"ok"`, else `"degraded"`
  (`gateway/readiness.py:118`), and the top-level `status` is just `readiness["status"]`
  (`api_server.py:3032`).

### 6.3 `GET /v1/capabilities` (auth required) — machine-readable feature map

Handler `api_server.py:3140-3224` (auth at `:3147`). Useful for feature-gating the Raycast UI
without version sniffing. Shape is emitted from the dict at `api_server.py:3151-3224`
(`features` block `:3169-3197`, `endpoints` block `:3198-3223`):

```json
{
  "object": "hermes.api_server.capabilities",
  "platform": "hermes-agent",
  "model": "hermes-agent",
  "auth": {"type": "bearer", "required": true},
  "runtime": {"mode": "server_agent", "tool_execution": "server", "split_runtime": false, "description": "..."},
  "features": {
    "chat_completions": true, "chat_completions_streaming": true,
    "responses_api": true, "responses_streaming": true,
    "run_submission": true, "run_status": true, "run_events_sse": true,
    "run_stop": true, "run_steer": true, "run_approval_response": true,
    "tool_progress_events": true, "approval_events": true,
    "session_resources": true, "model_options": true,
    "session_chat": true, "session_chat_streaming": true,
    "session_fork": true, "session_model_lock": true,
    "admin_config_rw": false, "jobs_admin": false, "memory_write_api": false,
    "skills_api": true, "audio_api": false, "realtime_voice": false,
    "session_continuity_header": "X-Hermes-Session-Id",
    "session_key_header": "X-Hermes-Session-Key",
    "cors": false
  },
  "endpoints": { "health": {"method": "GET", "path": "/health"}, ... }
}
```

Correction: only `object` and `platform` are string literals in the source. `"model"` is
**`self._model_name`** (`api_server.py:3154`), not a hardcoded `"hermes-agent"` — it happens to
resolve to `hermes-agent` on this install (see §6.4). `auth.required` is `bool(self._api_key)`
(`:3157`); `features.cors` is `bool(self._cors_origins)` (`:3196`) — `false` on this install,
consistent with §5. Every other `features.*` value listed above is a source literal.

**UNVERIFIED:** the `/v1/capabilities` body above was transcribed from the source dict, not from
a live authenticated response — I did not send an authenticated request. The `endpoints` map is
abridged here; the full 25-entry map is at `api_server.py:3198-3223`.

### 6.4 `GET /v1/models` — observed live (auth required)

```json
{
    "object": "list",
    "data": [
        {
            "id": "hermes-agent",
            "object": "model",
            "created": 1787168207,
            "owned_by": "hermes",
            "permission": [],
            "root": "hermes-agent",
            "parent": null
        }
    ]
}
```

Handler `api_server.py:3055-…`; `_resolve_model_name` (`api_server.py:1647-1669`) picks
explicit override → active profile name → `"hermes-agent"`.

---

## 7. Rate limiting, draining, idempotency, body limits

### 7.1 Concurrency cap → 429

`_concurrency_limited_response` (`api_server.py:6248-6277`):

```python
        limit = self._max_concurrent_runs
        if limit <= 0:
            return None
        inflight = self.active_agent_work_count()
        reservation = _api_agent_request_reservation.get()
        if reservation and reservation["active"]:
            inflight -= 1
        if inflight >= limit:
            return web.json_response(
                _openai_error(
                    f"Too many concurrent runs (max {limit})",
                    err_type="rate_limit_error",
                    code="rate_limit_exceeded",
                ),
                status=429,
                headers={"Retry-After": "1"},
            )
```

Literal 429 body (with `limit = 10`):

```json
{"error": {"message": "Too many concurrent runs (max 10)", "type": "rate_limit_error", "param": null, "code": "rate_limit_exceeded"}}
```

Cap source: `_resolve_max_concurrent_runs` (`api_server.py:1623-1645`) reads config key
**`gateway.api_server.max_concurrent_runs`**, default **10**, `0` disables, negatives clamp to 0.
Not set in this machine's `config.yaml` → effective cap 10.

**There is no per-IP / per-key token-bucket rate limiter.** The only throttles are this
concurrency cap, the drain 503, and the body-size limit. (Grep for `rate_limit`/`429`/`Retry-After`
in `api_server.py` returns only lines 1569, 6248, 6271, 6272, 6274, 6275 — plus line 2715, which
is an unrelated code *comment* about upstream provider 429s, not a server-side limiter.)

### 7.2 Drain → 503

`_draining_response` (`api_server.py:1559-1570`) returns, with `Retry-After: 1`:

```json
{"error": {"message": "Gateway is draining existing work; retry shortly.", "type": "invalid_request_error", "param": null, "code": "gateway_draining"}}
```

Checked inside `_admit_api_agent_request` right after auth (`api_server.py:1123-1125`), so it
applies to every agent-serving route. **Treat 503 + `gateway_draining` as retryable-with-backoff.**

### 7.3 Body size

`body_limit_middleware` (`api_server.py:1163-1186`). `Content-Length > MAX_REQUEST_BYTES`
(10,000,000) → 413 `body_too_large`; unparseable `Content-Length` → 400 `invalid_content_length`;
a chunked body that trips aiohttp's `client_max_size` mid-read is also converted to 413.
`web.Application(..., client_max_size=MAX_REQUEST_BYTES)` at `api_server.py:7471`.

### 7.4 `Idempotency-Key`

The header is advertised in `Access-Control-Allow-Headers` (`api_server.py:991`) and is
**actually honored on two routes**:

- `POST /v1/chat/completions` — `api_server.py:4421-4430`

```python
        idempotency_key = request.headers.get("Idempotency-Key")
        if idempotency_key:
            fp = _make_request_fingerprint(
                body,
                keys=["model", "provider", "model_options", "messages", "tools", "tool_choice", "stream"],
            )
            result, usage = await _idem_cache.get_or_set(idempotency_key, fp, _compute_completion)
```

- `POST /v1/responses` — `api_server.py:5546-5559`, same mechanism with
  `keys=["input", "instructions", "previous_response_id", "conversation", "model", "provider", "model_options", "tools"]`.

Semantics (`_IdempotencyCache`, `api_server.py:1211-1256`):

- In-memory, per-process, per-adapter-module (`_idem_cache = _IdempotencyCache()` at
  `api_server.py:1256`). **Lost on gateway restart.**
- `max_items = 1000`, `ttl_seconds = 300` (5 minutes) — `api_server.py:1213`.
- A hit requires **both** the same key **and** the same fingerprint
  (`sha256(repr({k: body.get(k) for k in keys}))`, `api_server.py:1258-1262`). Same key with a
  *different* body does NOT return the cached response — it computes a new one and overwrites.
- Concurrent identical (key, fingerprint) requests are single-flighted via
  `self._inflight` + `asyncio.shield(task)` (`api_server.py:1240-1256`) — the second caller
  awaits the first's result rather than running the agent twice.
- **Only the non-streaming path.** The streaming branch returns before the idempotency block.

**Recommended Raycast usage:** send `Idempotency-Key: <uuid>` on non-streaming
`/v1/chat/completions` and `/v1/responses` POSTs so a Raycast-side retry (network blip, user
re-invoking the command) cannot double-charge an agent turn. Keep the body byte-identical across
retries, and don't reuse a key beyond 5 minutes.

---

## 8. EVERY header the api_server reads

Complete enumeration from `grep -n 'request.headers.get(' gateway/platforms/api_server.py`
(13 sites, all listed):

| Line | Header | Where / meaning |
|---|---|---|
| `1000` | `Origin` | `cors_middleware`. Empty → allowed. Non-empty and not allowlisted → **403, empty body, before auth**. |
| `1168` | `Content-Length` | `body_limit_middleware`. `> 10_000_000` → 413 `body_too_large`; non-integer → 400 `invalid_content_length`. |
| `1723` | `X-Forwarded-For` | `_request_audit_context` — **audit logging only**, never trusted for authz. Sanitized to ≤200 chars, CR/LF stripped (`_clean_log_value`, `api_server.py:1703-1709`). |
| `1724` | `X-Real-IP` | Same: audit logging only. |
| `1727` | `User-Agent` | Audit logging only, ≤300 chars. |
| `1816` | `Authorization` | **THE auth header.** Must be `Bearer <API_SERVER_KEY>`; timing-safe byte compare. |
| `1907` | `Authorization` | `POST /api/platforms/{platform}/events` — passed to the target adapter's own `verify_http_event_request` verifier, NOT compared to `API_SERVER_KEY`. |
| `2139` | `X-Hermes-Session-Key` | Opt-in **long-term-memory scope key**. Stable per-channel identifier that survives across transcripts. Empty/absent → `(None, None)`. Requires `self._api_key` to be set (else **403**). Rejects `\r`, `\n`, `\x00` → 400 `{"error":{"message":"Invalid session key","type":"invalid_request_error"}}`. Max length `_MAX_SESSION_HEADER_LEN = 256` (`api_server.py:2118`). |
| `4238` | `X-Hermes-Session-Id` | Opt-in **session continuity**. When present, conversation history is loaded from `state.db` for that id **instead of** the request body's `messages`. Requires `self._api_key` (else 403, `api_server.py:4239-4251`). Rejects control chars and path-traversal shapes via `gateway.session._is_path_unsafe` → 400 `Invalid session ID`; `> 256` chars → 400 `Session ID too long`. When absent, a session id is derived deterministically as `f"api-{sha256(system_prompt + '\n' + first_user_message)[:16]}"` (`_derive_chat_session_id`, `api_server.py:1265-1280`). |
| `4421` | `Idempotency-Key` | `/v1/chat/completions` non-streaming idempotency (see §7.4). |
| `4543` | `Origin` | Inside a streaming handler (SSE response header assembly). |
| `4769` | `Origin` | Same, second streaming path. |
| `5546` | `Idempotency-Key` | `/v1/responses` non-streaming idempotency. |
| `5938` | `Authorization` | `POST /api/cron/fire` — NAS-minted JWT, verified against `cron.chronos.*` config, NOT `API_SERVER_KEY`. |

**Headers the server does NOT read:** no `X-Api-Key`, no `Api-Key`, no `X-Hermes-Api-Key`,
no cookies, no query-string key. Do not try them.

### 8.1 Headers the server WRITES back (worth consuming)

Complete enumeration from `grep -n 'X-Hermes-Session-(Id\|Key)"' gateway/platforms/api_server.py`
(the earlier draft listed only the first four rows; the rest were verified and added):

| Line | Header | Meaning |
|---|---|---|
| `3810` | `X-Hermes-Session-Id` | `effective_session_id or session_id` on a streaming response |
| `3812` | `X-Hermes-Session-Key` | Echoed only when a session key was in play |
| `4068`, `4071` | `X-Hermes-Session-Id` / `X-Hermes-Session-Key` | Same, second streaming path |
| `4463`, `4466` | `X-Hermes-Session-Id` / `X-Hermes-Session-Key` | `result.get("session_id", session_id)` on the non-streaming chat-completions response |
| `4548`, `4550` | `X-Hermes-Session-Id` / `X-Hermes-Session-Key` | SSE header assembly (first streaming path) |
| `4774`, `4776` | `X-Hermes-Session-Id` / `X-Hermes-Session-Key` | SSE header assembly (second streaming path) |
| `5642`, `5644` | `X-Hermes-Session-Id` / `X-Hermes-Session-Key` | `/v1/responses` response headers |
| `7081` | `X-Hermes-Session-Key` | Conditional spread, only when `gateway_session_key` is set |

**Raycast should capture `X-Hermes-Session-Id` from the first response and send it back on the
next turn** to get real server-side session continuity instead of re-uploading history.
(These are not in `Access-Control-Expose-Headers`, which matters only to browsers — Node reads
them fine.)

---

## 9. Multiplexing / profile prefixes (not active here, but be defensive)

- Prefix form: `/p/<profile>/v1/models`, `/p/<profile>/v1/chat/completions`, … Every route in
  `_http_route_table()` (`api_server.py:2053-2106`) is registered twice — bare and mirrored
  (`api_server.py:7473-7476`).
- `_resolve_request_profile` (`api_server.py:1966-2002`) returns `None` (handle as default) when
  **multiplexing is off**, even if a prefix was supplied; returns `_PROFILE_REJECTED` → 404
  `{"error": "Unknown or unconfigured profile"}` when on and the profile isn't served.
- Gate: `gateway.multiplex_profiles` in config.yaml, or env `GATEWAY_MULTIPLEX_PROFILES`
  (`hermes_cli/web_server.py:13054-13062`). **Not set on this machine → off.**
- Under multiplexing, a named profile's requests must present **that profile's**
  `API_SERVER_KEY` (`api_server.py:1758-1780`), and a missing/weak scoped key fails closed with
  the same 401 body.

**Raycast recommendation:** default to the bare (unprefixed) paths. Optionally expose a
"profile" preference that, when set, prefixes `/p/<name>`; a 404 with
`{"error":"Unknown or unconfigured profile"}` is the precise signal that the name is wrong or
multiplexing is off.

---

## 10. Concrete request examples (copy-paste ready)

Base URL for this machine: `http://127.0.0.1:8642`

**Discovery probe (no auth, no Origin):**

```
GET /health HTTP/1.1
Host: 127.0.0.1:8642
Accept: application/json
```
→ `200 {"status": "ok", "platform": "hermes-agent", "version": "0.20.4"}`

**Authenticated call:**

```
GET /v1/models HTTP/1.1
Host: 127.0.0.1:8642
Authorization: Bearer <API_SERVER_KEY from C:\Users\<usuario>\AppData\Local\hermes\.env line 478>
Accept: application/json
```
→ `200` (body in §6.4)

**Chat completion with session continuity + idempotency (shape from `api_server.py:4221-4470`):**

```
POST /v1/chat/completions HTTP/1.1
Host: 127.0.0.1:8642
Authorization: Bearer <key>
Content-Type: application/json
Idempotency-Key: 0f2c5a1e-9d3b-4d2a-9d21-6f4b7c8e1a55
X-Hermes-Session-Id: api-3f7c1b9e42ad00c1
```
```json
{
  "model": "hermes-agent",
  "messages": [
    {"role": "user", "content": "hello"}
  ],
  "stream": false
}
```
Response carries `X-Hermes-Session-Id` (`api_server.py:4463`) — persist it.

**Node fetch skeleton (the three non-obvious rules baked in):**

```js
const res = await fetch(`http://127.0.0.1:${port}/v1/models`, {   // 1. literal 127.0.0.1, never 'localhost'
  headers: {
    Authorization: `Bearer ${key}`,                               // 2. Bearer only
    Accept: 'application/json'
    // 3. NO Origin header — an Origin gets a bare 403 before auth
  },
  signal: AbortSignal.timeout(1500)
})
```

---

## 11. Open items / UNVERIFIED

- **UNVERIFIED:** whether the `"[api_server] API server listening on http://…"` log line
  (`api_server.py:7576-7579`) is persisted to a stable, parseable file under
  `C:\Users\<usuario>\AppData\Local\hermes\logs\`. I did not read the log directory contents.
  Do not build discovery on log scraping regardless.
- **UNVERIFIED:** exact behavior of `hermes_cli/env_loader.py::load_hermes_dotenv` regarding
  override-vs-setdefault semantics for an already-present `os.environ` value. The call site
  comment at `gateway/run.py:1968-1969` says *"User-managed env files should override stale shell
  exports on restart"*, implying override, but I did not read `env_loader.py`.
- **UNVERIFIED:** whether any Hermes-managed Windows service/scheduled task launches the gateway
  with a different `HERMES_HOME` than `C:\Users\<usuario>\AppData\Local\hermes`. The observed
  `gateway.pid` says it does not, and `gateway-service\Hermes_Gateway.cmd` hardcodes the same
  path.
- **Not applicable here but possible elsewhere:** an install where the desktop app spawns the
  gateway with `--port 0`. Nothing in `gateway/platforms/api_server.py` supports port 0 for the
  api_server (`_coerce_port` would accept `0`, and `TCPSite` would bind ephemerally), and no
  file records the result — step S2(g) (PowerShell socket enumeration by gateway PID) is the
  only recovery path. **UNVERIFIED** whether any shipped code path actually passes port 0 to the
  api_server adapter; I found none.
