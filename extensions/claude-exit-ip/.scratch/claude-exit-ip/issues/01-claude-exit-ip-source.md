# 01 — Can Node read the exit IP claude.ai sees?

Parent: [map.md](../map.md)
Type: research
Status: resolved
Blocked by: —

## Question

From a plain Node process (Raycast extension runtime, `node-fetch`, no browser, no cookies), can we read the source IP that `claude.ai` observes for our traffic — and how?

Establish, with evidence:

- Does `https://claude.ai/cdn-cgi/trace` exist and return the Cloudflare `key=value` block (`ip=`, `loc=`, `colo=`, ...)? Status code, body shape, headers, and whether a non-browser User-Agent gets served, challenged, or 403'd.
- If it works: is the `ip=` value the client's exit IP, and does it track the proxy that handles `claude.ai` traffic specifically (the whole point — split-tunnel users route `claude.ai` differently from general traffic)?
- Alternatives, ranked, with the same evidence: other Anthropic-owned Cloudflare-fronted hosts (`api.anthropic.com`, `www.anthropic.com`, `console.anthropic.com`), any public JSON endpoint that echoes the caller IP, and the neutral baselines ipcheck-ing already uses (`4.ipcheck.ing/cdn-cgi/trace`, `1.0.0.1/cdn-cgi/trace`).
- Failure modes: no network, proxy down, DNS blocked, Cloudflare challenge, rate limiting. What does each look like to the caller (exception? HTML body? 5xx?) so the extension can tell them apart.
- Rate limits and any ToS or robots consideration for polling these endpoints from a distributed extension.

Note the reference implementation in `~/Projects/Raycast/extensions/extensions/ipcheck-ing/src/getExternalIP.ts` — the trace-parsing shape to match.

Record findings under `## Answer`, and drop any long transcripts in `../research/01-*.md`.

## Answer

**`https://claude.ai/cdn-cgi/trace` works from a plain non-browser client and is the source to use.**

Verified 2026-07-25 with `curl -sS --max-time 15` (UA `curl/8.7.1`, no cookies, no custom headers):

| Endpoint | Status | `ip=` | `colo=` / `loc=` | Time |
|---|---|---|---|---|
| `https://claude.ai/cdn-cgi/trace` | 200 | `155.248.192.115` | `SJC` / `US` | 0.38s |
| `https://www.anthropic.com/cdn-cgi/trace` | 200 | `155.248.192.115` | `SJC` / `US` | 0.37s |
| `https://api.anthropic.com/cdn-cgi/trace` | 200 | `155.248.192.115` | `SJC` / `US` | 0.94s |
| `https://1.1.1.1/cdn-cgi/trace` (neutral baseline) | 200 | `154.3.37.188` | `HKG` / `HK` | 0.49s |

Findings:

- No browser User-Agent needed. Cloudflare served the trace block to bare `curl` with no challenge, no 403. Body is the standard `key=value\n` block; `ip=` is the caller's exit IP.
- **The premise holds.** The three Anthropic hosts all report `155.248.192.115` (US/San Jose) while the neutral Cloudflare endpoint reports `154.3.37.188` (HK) — this machine's proxy really does route Anthropic traffic separately, which is exactly the fact the extension exists to surface.
- All three Anthropic hosts agreed on this run, so `claude.ai` alone is sufficient; a second host would add latency for a value that was identical. Whether they can ever disagree (different proxy rules per hostname) is untested and is a judgement for [04](04-source-and-fallback-decision.md).
- Useful extra fields in the same response, free of charge: `colo` (Cloudflare edge, e.g. `SJC`), `loc` (two-letter country — a flag with **zero** geo API calls), `warp`, `gateway`, `http`, `tls`.
- Parse shape matches `~/Projects/Raycast/extensions/extensions/ipcheck-ing/src/getExternalIP.ts` exactly: split on `\n`, find the line starting with `ip=`, take the right side. That code is reusable as-is.

**Prior art: `https://ip.net.coffee/claude/`** — the page the reference screenshot came from. Its client-side JS calls `https://claude.ai/cdn-cgi/trace` for the IP, then its own `/api/geoip/<ip>` and `/api/iprisk/<ip>` for enrichment, plus `1.1.1.1/cdn-cgi/trace`, `my.ip.cn`, and `2026.ip138.com` as comparison sources.

Not established by this ticket, deliberately left to [04](04-source-and-fallback-decision.md):

- Failure-mode shapes. No network, dead proxy, DNS block, and Cloudflare challenge were **not** reproduced — only the happy path was observed. 04 must still define how a non-trace body (HTML challenge page, 5xx) is detected rather than parsed into garbage.
- Rate limits. Cloudflare publishes none for `cdn-cgi/trace`; a view command firing on launch is low-volume, but this is an assumption, not a measurement.
