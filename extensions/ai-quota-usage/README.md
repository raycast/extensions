# AI Quota Usage

See your **Claude Code** and **Codex** subscription quota (how much is left, when it
resets) and usage — at a glance, from Raycast.

## Status

Working now:

- **Claude Code** live quota (5-hour, weekly, and per-model weekly) from the
  `oauth/usage` endpoint — read from your current Claude Code login. If that login has
  expired, the row says so and asks you to re-login to Claude Code (we never refresh it
  for you).
- **Codex** live 5-hour and weekly quota from the `wham/usage` endpoint, using your
  current Codex login. If the request fails, the latest local session-log snapshot is
  shown as a fallback; days-old snapshots are marked stale.
- **Usage/cost** (today and this week, tokens + $) for both tools, via `ccusage`.

Next up: Store polish.

## How it works

- **Codex quota** is fetched live from the undocumented `wham/usage` endpoint using the
  access token and account ID in `~/.codex/auth.json` (read-only — we never write to or
  refresh it). The newest `~/.codex/sessions/**/rollout-*.jsonl` rate-limit snapshot is
  retained as an offline fallback.
- **Claude quota** is fetched live from the undocumented `oauth/usage` endpoint using the
  token from Claude Code's own login (read-only — we never write to or refresh it), only
  when you open the command, never polled in the background. When the login is expired or
  lacks the required scope, the row says exactly that instead of failing silently. The
  `oauth/usage` endpoint rate-limits hard, so results are cached ~5 min and the last good
  reading is reused on a throttle.
- **Usage/cost** is computed by the `ccusage` CLI, run via `npx` (the first run downloads
  it, so the Usage rows may take a few seconds to appear the first time).

Design decisions live in [`docs/adr/`](./docs/adr); terminology in [`CONTEXT.md`](./CONTEXT.md);
a build cheat-sheet in [`docs/build-reference.md`](./docs/build-reference.md).

## Preferences

- **Low-Quota Warning Threshold (%)** — colour a window red when remaining drops below
  this percent (default 20).
- **Claude / Codex Directory** — override the data directories if you don't use the
  defaults (`~/.claude`, `~/.codex`).
- **Claude OAuth Token (advanced)** — optional escape hatch: paste a Claude OAuth access
  token with the `user:profile` scope if reading your Claude Code login doesn't work. Left
  empty by default; a `claude setup-token` token lacks the scope and won't work.
- **Custom npx Path** — full path to `npx` if the usage/cost rows can't find it
  automatically (e.g. `/opt/homebrew/bin/npx`).

## Development

```sh
npm install
npm run dev      # launches into the Raycast app with hot reload
```

Requires Node ≥ 22.14 and the Raycast app. Regenerate the placeholder icon with
`node scripts/gen-icon.mjs`.
