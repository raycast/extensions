# OCG API and pricing schema

Status: resolved
Type: research
Blocked by: —

## Question

Capture the exact facts a Mac implementer needs to reproduce the omarchy collector, with sources and example payloads:

1. `GET https://opencode.ai/zen/go/v1/usage`: full response shape and semantics — the three windows (rolling 5h / weekly / monthly), each window's fields (limit amount, used, remaining, reset time, units), and how they map to omarchy's `{rolling, weekly, monthly}` extraction. Auth = `Authorization: Bearer <key>`.
2. Key location: does opencode (OpenCode Go) on macOS still store its key at `~/.local/share/opencode/auth.json` under `opencode-go.key`, or does the macOS build differ? Confirm against opencode docs and behavior (https://opencode.ai/docs/go/, `opencode /connect`).
3. `GET https://opencode.ai/zen/go/v1/models`: response shape (where model ids live, e.g. `.data[].id`), and whether ids are stable/unique and length-capped as the reference assumes.
4. `https://models.dev/api.json`: structure under `opencode-go.models[*]` and its `.cost` fields (`input`, `output`, `cache_read`), whether promos are reflected, and how often it changes.
5. HTTP/error behavior: status codes and bodies for missing/invalid key and rate limiting, so the extension can distinguish "no key", "bad key", and "offline".

This ticket exists to decide **Auth & key handling** and to ground the data layer; field names and example values are the payload.

## Answer

Findings: `.scratch/opencode-usage/research/ocg-api-and-pricing-schema/findings.md`

- `GET https://opencode.ai/zen/go/v1/usage` (Bearer key) → `{"usage":{"rolling":W,"weekly":W,"monthly":W}}`; each window `W = {"status":"ok"|"rate-limited","percent":<int 0-100 used>,"resetsAt":"<ISO-8601 UTC>"}`. **No dollar amounts** — the $12/$30/$60 caps come from the docs, not the API. `percent` = floor(used/limit×100), pinned to 100 when `rate-limited`.
- Key location: `~/.local/share/opencode/auth.json` → `["opencode-go"].key`; **macOS identical to Linux**. Schema `{"type":"api","key":…}`.
- `GET /zen/go/v1/models` is public → OpenAI-style `{"data":[{"id":"deepseek-v4-flash",…}]}`; ids at `.data[].id`, kebab-case without the `opencode-go/` prefix.
- `models.dev/api.json`: `opencode-go.models` keyed by model id, each with `.cost.{input,output,cache_read}` (+ optional `cache_write`, `tiers`); **no promos** reflected; slow-moving, cacheable.
- Errors (envelope `{"type":"error","error":{"type","message"}}`): 401 `AuthError` (missing key / Unauthorized), 403 `EntitlementError "OpenCode Go subscription required."`, 429 on inference routes; window exhaustion is in-band `rate-limited` + `percent:100`. Classify: no-key locally (auth.json absent), bad-key=401, no-entitlement=403, offline=transport failure.

