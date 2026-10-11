# OCG API and pricing schema — findings

Ticket: `02-ocg-api-and-pricing-schema` (research, for **Auth & key handling** and the data layer).
Scope: exact facts a macOS implementer needs to reproduce the omarchy `collector.sh` against the OpenCode Go backend.
Date of investigation: 2026-09-08. All payloads below were observed live on that date unless marked "(source)".

**TL;DR** — `GET /zen/go/v1/usage` (Bearer key) returns `{ "usage": { rolling, weekly, monthly } }`, each window `{ status, percent, resetsAt }`. There is **no limit/used/remaining/unit in the payload** — only percent-used (0–100 int) and an ISO-8601 reset time; the $-caps ($12 / $30 / $60) come from the docs, not the API. The Go key lives at `~/.local/share/opencode/auth.json` → `["opencode-go"].key` on macOS, same as Linux. `GET /zen/go/v1/models` is public, OpenAI-style `{object:"list",data:[{id,…}]}`. Pricing comes from `https://models.dev/api.json` under `opencode-go.models[*].cost.{input,output,cache_read}` (no promos; slow-moving). Errors: 401 = missing/invalid key, 403 = valid key but no Go subscription, envelope `{type:"error",error:{type,message}}`.

---

## 1. `GET https://opencode.ai/zen/go/v1/usage`

### Auth
- `Authorization: Bearer <key>`. The upstream route matches the header with `/^Bearer (\S+)$/` and reads only that — **the usage route accepts only Bearer**, which is the inverse of the inference side (`/zen/go/v1/messages` only honors `x-api-key`; they are not interchangeable). Source: `packages/console/app/src/routes/zen/go/v1/usage.ts` in anomalyco/opencode (also documented by third-party implementers).
- No `x-opencode-session` is required by this route (the upstream handler never reads it). Sending a stable one is harmless/optional (e.g. openchamber sends `x-opencode-session: openchamber-usage` for attribution).
- This route is **first-party but not documented** in the official docs (go.mdx documents only `/models`). It changed shape once on launch day (PR [anomalyco/opencode#16513](https://github.com/anomalyco/opencode/pull/16513), deployed 2026-08-11): an older flat shape (`rollingUsage` / `usagePercent` / `resetInSec`) is deprecated. Implementers should parse defensively and treat "all three windows parseable" as the success signal.

### Success response (200)
```
{
  "usage": {
    "rolling":  { "status": "ok",            "percent": 42, "resetsAt": "2026-09-08T21:41:30.000Z" },
    "weekly":   { "status": "ok",            "percent": 17, "resetsAt": "2026-09-13T23:59:59.000Z" },
    "monthly":  { "status": "ok",            "percent": 63, "resetsAt": "2026-10-01T00:00:00.000Z" }
  }
}
```
Verified against the upstream route source, which builds each window via `formatUsage(...)` → `{ status, percent, resetsAt }` from `Subscription.analyze{Rolling,Weekly,Monthly}Usage(...)`.

### Per-window fields (each window is exactly these three keys)
| Field | Type | Semantics |
|---|---|---|
| `status` | string | `"ok"` or `"rate-limited"`. When the window's dollar usage ≥ limit, upstream sets `"rate-limited"` **and pins `percent` to `100`** (source: `analyze*Usage` in `packages/console/core/src/subscription.ts`). |
| `percent` | integer 0–100 | **Percent of the window's dollar limit already used** — `Math.floor(Math.min(100, usageMicroCents / limitMicroCents * 100))`. Not a remaining value, not a dollar figure. |
| `resetsAt` | string, ISO-8601 UTC | `new Date(Date.now() + resetInSec*1000).toISOString()`. `resetInSec`: rolling = seconds until the end of the 5 h rolling window anchored to the last billing update; weekly = until end of the current calendar week; monthly = until end of the subscription's billing month (`getMonthlyBounds(now, timeSubscribed)`). |

Edge semantics worth knowing:
- `percent: 0` with `resetsAt` present is a **placeholder**: upstream returns `resetInSec = full window length` (e.g. 5 h) when there has been no usage in the period. Implementers (e.g. cc-switch) drop the countdown when `percent === 0`.
- The API does **not** return dollar caps, used dollars, remaining dollars, or units. Dollar limits are implied: **5 h = $12, weekly = $30, monthly = $60** (live docs, https://opencode.ai/docs/go/). The caps themselves are read server-side from a private `ZEN_LIMITS` SST secret (`rollingLimit`, `rollingWindow`, `weeklyLimit`, `monthlyLimit` in the `lite` plan — see `Subscription.LimitsSchema`), so they can change without a client update.

### Mapping to omarchy `{rolling, weekly, monthly}`
`collector.sh` (ardfard/omarchy-opencode-usage) extracts exactly:
```
jq -c '{rolling:.usage.rolling,weekly:.usage.weekly,monthly:.usage.monthly}'
```
i.e. the three keys under `.usage` are carried over verbatim as the collector's `windows` object. `Model.js` then consumes each as `{status, percent, resetsAt}` (it also tolerates an optional `limitDollars`, defaulting to 0). So for a Mac implementation: fetch `/usage`, parse `.usage`, and the keys `rolling` / `weekly` / `monthly` are the widget's windows — no renaming, no recomputation of "used/remaining" beyond `remaining = 1 − percent/100`.

### Example authenticated request
```
curl -sS https://opencode.ai/zen/go/v1/usage -H "Authorization: Bearer <key>"
```

---

## 2. Key location on macOS

**Same as Linux: `~/.local/share/opencode/auth.json`, entry `["opencode-go"].key`.** The macOS build does not differ.

- opencode source: `const file = path.join(Global.Path.data, "auth.json")`, written `0o600` (`packages/opencode/src/auth/index.ts`). `Global.Path.data` = `~/.local/share/opencode` on macOS/Linux (confirmed by the official troubleshooting doc: "**macOS/Linux**: `~/.local/share/opencode/`"; Windows also uses `%USERPROFILE%\.local\share\opencode`).
- Official docs: https://opencode.ai/docs/providers/ — "When you add a provider's API keys with the `/connect` command, they are stored in `~/.local/share/opencode/auth.json`." CLI docs (`opencode auth login`) state the same.
- `/connect` flow for Go: TUI → `/connect` → select **OpenCode Go** → paste key → opencode writes it under provider id `opencode-go`. (`opencode auth login` writes the same file.)
- auth.json schema (source: `Auth` classes in `packages/opencode/src/auth/index.ts`): top-level JSON object keyed by provider id; an API-key entry is `{ "type": "api", "key": "<key>", "metadata"?: {...} }`. So the Go key is `JSON.parse(...)["opencode-go"]["key"]`.
  Example:
  ```
  { "opencode-go": { "type": "api", "key": "ocg-xxxx" }, "anthropic": { "type": "api", "key": "sk-ant-..." } }
  ```
- Environment override: opencode's auth module honors `OPENCODE_AUTH_CONTENT` (JSON) in place of the file; an extension may honor it but the file path is the norm.
- **Only the `opencode-go` entry is valid for the usage API.** A bare `opencode` (Zen) key may lack Go entitlement and gets the opaque 403 (see §5). The official Raycast `agent-usage` extension reads exactly `auth.json["opencode-go"].key` (`readOpencodeAuthToken("opencode-go")` → `entry.key ?? entry.access`, trimmed; null if file/entry missing) and documents auto-detection "from OpenCode (`~/.local/share/opencode/auth.json`)".
- macOS/sandbox note: Raycast extensions run outside the App Store sandbox and can read the user's home directory; the shipped `agent-usage` extension already reads this file, so this is an established pattern (relevant for ticket 05's sandbox question).

---

## 3. `GET https://opencode.ai/zen/go/v1/models`

**Public — no auth required** (empirically returned `200` with no `Authorization` header on 2026-09-08). Documented in go.mdx under Endpoints → Models: "You can fetch the full list of available models and their metadata from: `https://opencode.ai/zen/go/v1/models`".

Response shape (observed live):
```
{
  "object": "list",
  "data": [
    { "id": "minimax-m3",                "object": "model", "created": 1788896130, "owned_by": "opencode" },
    { "id": "deepseek-v4-flash",         "object": "model", "created": 1788896130, "owned_by": "opencode" },
    { "id": "muse-spark-1.3-contributor","object": "model", "created": 1788896130, "owned_by": "opencode" },
    ...
  ]
}
```
- Model ids live at **`.data[].id`** (OpenAI-style list). No `opencode-go/` prefix — that prefix is only used in the opencode **config** id (`opencode-go/<id>`, e.g. `opencode-go/kimi-k3`; see go.mdx).
- `created` is identical for all entries (1788896130, a deployment timestamp) and `owned_by` is always `"opencode"` — do not rely on either for sorting/identity.
- **Count**: 35 models today (2026-09-08). The go.mdx docs page lists only 28; the API currently returns 7 more than the docs (`kimi-k2.5`, `glm-5`, `qwen3.5-plus`, `mimo-v2-pro`, `mimo-v2-omni`, `hy3-preview`, `grok-4.5`). Docs: "The list of models may change as we test and add new ones."
- **Stability/length**: ids are lowercase kebab-case slugs, identical to the ids in the docs table and to the `opencode-go.models` keys on models.dev, so they are stable, unique catalog slugs. Longest id today is `muse-spark-1.3-contributor` (25 chars) — comfortably under the 128-char cap the omarchy collector enforces (`length <= 128`, `MAX_MODEL_ID_LEN = 128`), so the reference's cap is a sanity bound, not a live constraint.

---

## 4. `https://models.dev/api.json`

- Top-level: JSON object keyed by provider id. `opencode-go` is one provider key:
  ```
  {
    "id": "opencode-go",
    "name": "OpenCode Go",
    "doc": "https://opencode.ai/docs/zen",
    "api": "https://opencode.ai/zen/go/v1",
    "env": ["OPENCODE_API_KEY"],
    "npm": "@ai-sdk/openai-compatible",
    "models": { ... }
  }
  ```
- **`opencode-go.models` is an object keyed by model id** (35 keys today — exactly the same 35 the `/models` endpoint returns). Each value is the model metadata + cost, e.g.:
  ```
  "qwen3.7-max": {
    "id": "qwen3.7-max", "name": "Qwen3.7 Max", "family": "qwen3.7-max",
    "reasoning": true, "tool_call": true, "open_weights": false,
    "limit": { "context": 1000000, "output": 65536 },
    "cost": { "input": 2.5, "output": 7.5, "cache_read": 0.5, "cache_write": 3.125 }
  }
  ```
- **`.cost` fields** (all US$ per 1M tokens): `input`, `output`, `cache_read` — the three the omarchy collector maps to `{in, out, cache}` — plus, on some models, `cache_write` and `tiers`/`context_over_200k` (over-context surcharges: `qwen3.6-plus`, `qwen3.7-plus`, `minimax-m3`, `grok-4.5`, `grok-4.6`, `gpt-5.6-luna`, `mimo-v2-pro`). The collector only reads `input`/`output`/`cache_read` and ignores the rest — safe.
  `mimo-v2.5` sample (matches the docs table): `{ "input": 0.14, "output": 0.28, "cache_read": 0.0028 }`.
- **Promos are NOT reflected.** There are zero `promo` fields anywhere under `opencode-go`. The prices are flat list prices and match the go.mdx pricing table's single-price entries (e.g. `deepseek-v4-flash` → `{input:0.22, output:0.66, cache_read:0.007}` = the docs' **Off-Peak** price; the docs' separate **Peak** prices (0.44/1.32/0.014) do not appear in models.dev). For context-tiered models (e.g. `grok-4.6`, `gpt-5.6-luna`, `qwen3.7-plus`), models.dev stores the **base** tier as `.cost` and the over-context tier under `.cost.tiers` — the collector uses only the base `.cost`.
- **Change cadence**: no fixed schedule. models.dev is the community/PR-driven catalog that opencode itself consumes for providers (opencode docs: "OpenCode uses the AI SDK and Models.dev to support 75+ providers"). `api.json` carries no top-level timestamp, but each model has a `last_updated` field; the `opencode-go` entries span **2026-01-27 … 2026-09-04** (latest update ≤ 4 days before this investigation). Treat it as slow-moving and cache it (the omarchy default refresh is hourly, which is plenty).

---

## 5. HTTP / error semantics

Error envelope for all non-2xx errors: `{"type":"error","error":{"type":"<ErrorType>","message":"<msg>"}}`.

| Case | HTTP | Body (exact) | How the extension should classify |
|---|---|---|---|
| No `Authorization` header | 401 | `{"type":"error","error":{"type":"AuthError","message":"Missing API key."}}` | bad/missing key (observed live + route source) |
| Header present but key not found in DB | 401 | `{"type":"error","error":{"type":"AuthError","message":"Unauthorized"}}` | bad key |
| Key valid but account/workspace has **no Go subscription** | 403 | `{"type":"error","error":{"type":"EntitlementError","message":"OpenCode Go subscription required."}}` | valid key, no entitlement — distinct from bad key |
| Success | 200 | usage object (§1) | ok |
| Rate limit / quota (inference-side) | 429 | e.g. `FreeUsageLimitError` / `"Rate limit exceeded"` (observed on zen inference routes; reported in opencode issues [#42765](https://github.com/anomalyco/opencode/issues/42765), [#33495](https://github.com/anomalyco/opencode/issues/33495)) | rate-limited/backoff |

Notes:
- The `/usage` route has **no rate-limit code of its own** (upstream source shows none); Cloudflare sits in front (`server: cloudflare`, `cf-ray`, `cf-placement` headers observed). Treat an unexpected 429 defensively (retry-after backoff).
- Go **window exhaustion is not an HTTP error** on `/usage` — it is reported **in-band** as `status: "rate-limited"` with `percent: 100` (§1). The HTTP 429s above belong to the inference/zen routes.
- Classifier recipe for the extension's "no key / bad key / offline" states:
  - **no key**: local — `~/.local/share/opencode/auth.json` absent, unreadable, or `["opencode-go"]` entry missing (or empty). No network call needed. Hint at `/connect`.
  - **bad key**: HTTP 401 (either AuthError body).
  - **no entitlement**: HTTP 403 → the official Raycast extension maps 403 to a distinct `forbidden` error ("OpenCode Go subscription not found for this API key") rather than "invalid key". Consider surfacing it separately.
  - **offline**: transport failure (DNS/TLS/timeout/connectivity) → no HTTP response. Use a timeout like the reference (collector uses `-m 10`; raycast agent-usage uses 10–15 s `AbortSignal.timeout`).
  - `parse_error`: 200 body that doesn't have `.usage.{rolling,weekly,monthly}` (shape drift — it changed once already).

---

## Reference collector recipe (what the Mac extension should replicate)

From `collector.sh` (ardfard/omarchy-opencode-usage) with sources above:
1. **Catalog**: `GET /zen/go/v1/models` (public) → `.data[]?.id`, drop empty/too-long (`length <= 128`), cap (default 200).
2. **Pricing**: `GET https://models.dev/api.json` → `opencode-go.models`, keep only ids present in the catalog with a `.cost`, map `{ in: cost.input, out: cost.output, cache: cost.cache_read }` (missing → 0).
3. **Windows**: read `~/.local/share/opencode/auth.json` → `["opencode-go"].key` → `GET /zen/go/v1/usage` with `Authorization: Bearer <key>` → `{ rolling: .usage.rolling, weekly: .usage.weekly, monthly: .usage.monthly }`; null/absent key ⇒ windows `null` (widget shows "no limits yet").
4. Combine into one JSON `{ status:"ok", windows, catalog, pricing, updatedAt, error:"" }`; render `percent`, `resetsAt` countdown, and `remaining = 1 − percent/100` per window.

---

## Sources

Official (primary):
- https://opencode.ai/docs/go/ — product, limits ($12/5h, $30/week, $60/month), pricing table, model ids, `/models` endpoint, `opencode-go/<id>` config prefix, `/connect` flow.
- https://opencode.ai/docs/providers/ — `~/.local/share/opencode/auth.json`; `/connect` for OpenCode Go.
- https://opencode.ai/docs/cli/ — `opencode auth login` stores keys in `~/.local/share/opencode/auth.json`.
- https://opencode.ai/docs/troubleshooting/ — macOS/Linux data dir `~/.local/share/opencode/`.
- https://github.com/anomalyco/opencode — route source `packages/console/app/src/routes/zen/go/v1/usage.ts`; window math `packages/console/core/src/subscription.ts`; auth schema `packages/opencode/src/auth/index.ts`; limits secret `ZEN_LIMITS`; PR #16513 (usage endpoint); zen 429/`FreeUsageLimitError` issues #42765, #33495.
- https://github.com/ardfard/omarchy-opencode-usage — `collector.sh`, `Model.js` (reference to mirror).
- https://github.com/raycast/extensions/tree/main/extensions/agent-usage — official Raycast extension already reading `~/.local/share/opencode/auth.json` → `opencode-go.key`, fetching `/usage`, and mapping 401/403.
- https://models.dev/api.json — pricing data (fetched 2026-09-08; 35 `opencode-go` models, `.cost.{input,output,cache_read}`).
- Empirical live calls 2026-09-08: `GET /zen/go/v1/models` (200, no auth), `GET /zen/go/v1/usage` (401 AuthError "Missing API key.").