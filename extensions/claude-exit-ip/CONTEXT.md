# CONTEXT

Glossary and ubiquitous language for Claude Exit IP. Use these terms verbatim in issues, tests, and commits.

The full reasoning lives in `.scratch/claude-exit-ip/spec.md`. This file names things; the spec justifies them.

## Core terms

**Exit IP** — the IP address `claude.ai` sees you connect from. Not "my IP", and not what a neutral IP-lookup service reports: under split routing those differ, which is why this extension exists.

**Trace** — the `key=value` block from `https://claude.ai/cdn-cgi/trace`, and the only exit-IP source. One host, no fallback. A response counts as a trace only when an `ip=` line parses as IPv4 or IPv6 **and** the body contains `h=claude.ai`; the host echo is what proves Cloudflare's `claude.ai` edge answered rather than a captive portal.

**Geo lookup** — the `ipwho.is` call that turns an exit IP into country, city, and ISP. It degrades, it never errors.

**Card** — the single `Detail` view the command renders. Four markdown slots throughout: **H1**, **location line**, **horizontal rule**, **footer**. Say "card", not "view" or "panel".

**Location line** — the second slot: `country · city · ISP`. Region is dropped. An empty ISP omits the segment; there is no placeholder.

**Provenance** — the footer on a failure card, naming what was called and what came back. On a healthy card that slot holds the **caption** instead.

**Partial marker** — the inline `— location lookup failed` on the `geo-failed` location line. It keeps the *card* from overstating what it knows, so it never enters a clipboard payload.

## Card states

Six, in `CardState` (`src/lib/refresh.ts`). Use the hyphenated spellings exactly:

| State | Meaning |
|---|---|
| `loading` | Cold start only. Empty H1 under `isLoading`. |
| `ip-only` | Exit IP and country known; geo still in flight. |
| `success` | Exit IP with full location line. |
| `geo-failed` | Exit IP known; geo settled as failed. |
| `blocked` | Something answered, but not with a trace. Carries `status` and `reason`. |
| `unreachable` | Nothing answered at all. |

`blocked` and `unreachable` are the two **failure cards**. `ip-only` is *pending*; `geo-failed` is *settled*. That difference drives which actions appear, so do not treat them as the same condition.

## The seam

Three pure functions carry all the logic. They are the only place behavior tests belong:

- `parseTrace(status, body) → TraceResult` — `src/lib/trace.ts`
- `parseGeo(json) → GeoResult` — `src/lib/geo.ts`
- `nextState(prev, trace) → CardState` — `src/lib/refresh.ts`

`fetchTrace.ts` and `fetchGeo.ts` are thin wrappers, untested by design. **There is no injectable `fetch` in production code.** No test mocks `fetch`, spies on a call, or renders a component: fixture in, value out.

## Refresh

**One refresh semantic in every state:** discard everything, re-fetch the trace, re-fetch geo for whatever exit IP comes back. There is no geo-only retry — that would assume the exit IP has not changed, which is the assumption this extension exists to distrust.

**The race** is resolved by comparing exit IPs in `nextState`: same IP keeps the card, a changed IP drops to `ip-only`, a failed trace replaces the healthy card. The latest press wins because both fetches take the hook's abort signal.

No caching, no timers, no automatic retry, no toasts. Refresh is primary on both failure cards — **the retry is the design, it is simply manual.**

## Two spellings that are traps

Both look correct and both produce a card that looks fine:

1. `json.success === false` — **not** `!json.success`. The `?fields=` trim drops `success` from a healthy body, so the negation fails every successful lookup.
2. `AbortSignal.any([hookSignal, AbortSignal.timeout(5000)])` — **not** a bare `AbortSignal.timeout(5000)`, which drops the hook's signal and silently voids the abort ordering.

## Verification

The **machine gate** is headless: `npm test`, `npm run type-check`, `npm run build`, `npm run lint`.

The **human sweep** is `npm run dev` in Raycast, watching each card state by eye. Raycast state cannot be observed headlessly, so no amount of machine gate replaces it. A failure in the sweep reopens the build session; it does not become a new ticket.
