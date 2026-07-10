# Usage/cost comes from the ccusage CLI, not our own log parsing

## Context

We already read local logs for the Codex quota snapshot, so it's tempting to also
compute usage/cost (tokens, dollars) by parsing `~/.claude/projects/**/*.jsonl` and
`~/.codex/sessions/**/*.jsonl` ourselves. Two reasons not to:

1. **Accuracy.** Claude Code's JSONL `input_tokens`/`output_tokens` are frequently
   placeholder/undercounts (anthropics/claude-code #28197); only the cache-token
   fields are reliable. Correct cost needs LiteLLM pricing, cache-vs-input handling,
   reasoning-token folding, and `costUSD`-vs-compute cost modes.
2. **`ccusage` already does all of this for both tools** — it reads Claude's logs
   *and* Codex's `CODEX_HOME/sessions` (ccusage.com/guide/codex), with daily / weekly /
   monthly / session / blocks views and per-model breakdown.

## Decision

Get usage/cost by **shelling out to the `ccusage` CLI** (via `@raycast/utils`
`useExec`), not by reimplementing log parsing. Quota (remaining/reset) still comes
from the endpoints + Codex snapshot per [ADR 0001](./0001-quota-via-undocumented-endpoints-on-open-only.md) —
ccusage does **not** provide plan remaining/reset.

## Considered options

- *Parse the JSONL ourselves:* rejected — re-derives a solved, fiddly problem and
  inherits the #28197 token-undercount bug.

## Consequences

- Adds a runtime dependency on `ccusage` being runnable. Need an availability
  strategy: `npx ccusage@latest` (needs network on first fetch), or bundle/pin it,
  or try `bunx`/`pnpm dlx` fallbacks like the reference extension. Cache results.
- Spawn latency per invocation → cache and show last-good while refreshing.
