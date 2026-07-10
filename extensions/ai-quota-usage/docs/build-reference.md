# Build Reference — AI Quota Usage (Raycast extension)

Actionable facts gathered during design (mid-2026), with sources. This is the
"how to build & publish" cheat sheet; the *why* lives in `../CONTEXT.md` and `adr/`.

## 1. Raycast extension basics

- **Stack:** TypeScript + React. Deps: `@raycast/api` (UI + platform) and
  `@raycast/utils` (hooks: `useExec`, `useCachedPromise`, `useFetch`, `useSql`…).
  Node **22.14+**, npm 7+, Raycast 1.26+.
- **Scaffold:** Raycast → "Create Extension" command (pick a template, e.g. Detail),
  then `npm install && npm run dev` (hot reload). Entry: `src/<command-name>.tsx`.
- **Command modes** (each entry in `package.json` `commands[]` has a `mode`):
  `view` (renders List/Detail/Form in the Raycast window — **this is what we ship**),
  `no-view` (headless), `menu-bar` (`MenuBarExtra` in the macOS system bar — **not** shipping v1).
  One extension can mix modes; adding a menu-bar command later needs no data-layer change.
- **No sandbox.** Extensions run as a full Node child process: `fs`, `child_process`,
  `fetch` all work. Reading `~/.claude` / `~/.codex` and spawning `ccusage` is first-class.
  (Security is enforced by mandatory review + public source, not isolation.)
  Docs: developers.raycast.com/information/manifest · /api-reference/menu-bar-commands ·
  raycast.com/blog/how-raycast-api-extensions-work

## 2. The view we're building

- `List` with `isShowingDetail={true}`. Two `List.Item`s: **Claude Code**, **Codex**
  (accessory = quick "5h 45%"). Each item's `detail` = `List.Item.Detail` with a
  `metadata` panel: **额度** (5h remaining% + reset countdown, weekly remaining% + reset,
  Claude per-model weekly Opus/Sonnet, plan type, "refreshed X ago") and **用量**
  (today / this-week tokens · ~$).
- On open (view commands always run `LaunchType.UserInitiated`): render Codex snapshot
  instantly, fire live endpoints + `ccusage`, show loading, then reconcile. `⌘R` = manual
  refresh (`revalidate`). Cache last-good in `LocalStorage`.
- Preferences via `getPreferenceValues<Preferences>()`; declare in `package.json`
  `preferences[]` (types: `directory` for path overrides, `textfield`, `checkbox`, `dropdown`).

## 3. Data sources

### Claude Code quota — live only (undocumented)
```
GET https://api.anthropic.com/api/oauth/usage
  Authorization: Bearer <accessToken>
  anthropic-beta: oauth-2025-04-20
  User-Agent: claude-code/<ver>        # REQUIRED — omitting → aggressive 429s
```
Token: `~/.claude/.credentials.json` → `claudeAiOauth.accessToken`, else macOS Keychain
`security find-generic-password -s "Claude Code-credentials" -w`. Token expires ~60 min.
Response: `five_hour{utilization,resets_at}`, `seven_day{…}`, `seven_day_opus`,
`seven_day_sonnet`, `extra_usage`. `utilization` = percent used (remaining = 100−util).
Poll ≥~180s, cache hard, handle 429/expiry. Reference impl: raycast/extensions `ccusage`
(`utils/claude-api-client.ts`, `utils/keychain-access.ts`).

### Codex quota — offline snapshot + live
- **Snapshot (offline):** newest `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`, last
  `event_msg` with `payload.type=="token_count"` → `rate_limits`:
  `primary{used_percent,window_minutes:300,resets_at}` (5h),
  `secondary{…,window_minutes:10080,…}` (weekly), `plan_type`. Stale = last Codex turn.
- **Live:** `GET https://chatgpt.com/backend-api/wham/usage` with token from
  `~/.codex/auth.json` (`tokens.access_token`, refresh via `refresh_token`). Returns
  `used_percent`, `reset_at`, `limit_window_seconds`, plan. Reference: `lhl/pi-codex-status`.

### Usage / cost — the `ccusage` CLI (both tools)
- `npx ccusage@latest` (or bunx/pnpm dlx). Supports Claude logs AND Codex
  (`CODEX_HOME/sessions`). Views: `daily`/`weekly`/`monthly`/`session`/`blocks`,
  `--breakdown`, JSON output. Prices via LiteLLM. Call via `useExec`; cache.
  ccusage.com · ccusage.com/guide/codex

## 4. Publishing to the Store

1. `npm run build` (validates). 2. `npm run publish` → opens a PR to
   `raycast/extensions` (GitHub auth). 3. Human review → merge → auto-publish.
- **Requirements:** `license: "MIT"`; `author` = Raycast username; 512×512 icon
  (light+dark friendly); `metadata/` screenshots 2000×1250 (≤6); ≥1 category;
  concise one-sentence description; `CHANGELOG.md` (`## [x] - {PR_MERGE_DATE}`);
  `README.md` if setup needed; committed `package-lock.json`.
- Private alternative: Raycast for Teams private store (`npm run publish` into the org).
  Docs: developers.raycast.com/basics/prepare-an-extension-for-store · /publish-an-extension

## 5. Known risks / first-run

- Reading Claude's Keychain credential may trigger a one-time macOS auth prompt.
- Both tools must have been run at least once (logs/token must exist).
- Both quota endpoints are **undocumented** → may change/break; "quota unavailable"
  is a first-class state, usage/cost still works offline.
- `ccusage` via `npx` needs network on first fetch (or bundle/pin it).
