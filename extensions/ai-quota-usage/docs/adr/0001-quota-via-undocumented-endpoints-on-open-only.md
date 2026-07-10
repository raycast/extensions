# Quota data comes from undocumented endpoints, fetched only when the view opens

## Context

The extension's primary job is quota monitoring ("how much is left, when does it
reset"). But authoritative live quota is not cleanly available locally:

- **Claude Code** stores no remaining/reset in its logs at all. The only source is
  the undocumented `GET https://api.anthropic.com/api/oauth/usage`, called with
  Claude Code's own stored OAuth token (`~/.claude/.credentials.json` or macOS
  Keychain). This is the exact technique the reference `nyatinte/ccusage` extension uses.
- **Codex** logs a real `rate_limits` snapshot in the newest `rollout-*.jsonl`, but
  it is only as fresh as the user's last Codex turn. Live/fresh numbers require the
  undocumented `https://chatgpt.com/backend-api/wham/usage` (token from `~/.codex/auth.json`).

Both endpoints are undocumented, aggressively rate-limited (429s, often no
`Retry-After`), and a gray area (authenticated calls made as the user, outside the
official client).

## Decision

1. **Ship a view command only — no menu-bar (`MenuBarExtra`) command.** Monitoring
   is **pull-based** (open the command to check), not an ambient always-on
   indicator. This means there is **no background execution and no polling at all** —
   a decision that shrinks the gray-area footprint to "only when the user looks."
2. **On every open**, fetch live quota and reconcile with cheap local data:
   - Fetch the **live endpoints** (`oauth/usage` for Claude, `wham/usage` for Codex)
     and persist the last-good result (`LocalStorage`) so a throttled/failed fetch
     still shows recent numbers rather than nothing.
   - **Codex** additionally reads the offline `rollout-*.jsonl` snapshot and uses it as
     a **fallback** when the live call fails (a days-old reading is marked stale). Claude
     has no offline quota source, so it simply reports why it's unavailable.
   - *Future refinement:* paint the offline Codex snapshot instantly and swap in the
     live numbers when they arrive, for a zero-latency first frame. The current build
     awaits the live call (fast in practice) before first paint.
3. **Degrade gracefully**: if an endpoint breaks/blocks, fall back to log-derived
   usage/cost (always available offline) and mark quota as "unavailable".

## Considered options

- *Menu-bar command with background polling (~3–5 min):* rejected — the user prefers
  open-to-check over an ambient indicator, and background-polling the endpoints
  invites aggressive 429s, burns the user's token, and enlarges the gray-area footprint.
- *Offline only, no endpoints:* rejected — Claude then can't show remaining at all,
  which fails the chosen primary job.

## Consequences

- No ambient glance: the user only sees quota after explicitly opening the command.
  (A menu-bar command can be added later without changing the data layer.)
- Both endpoints are undocumented and may break without notice; the fallback path
  and a clear "quota unavailable" state are first-class, not afterthoughts.
