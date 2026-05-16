# Superhuman Changelog

## [Skills routing layer + upstream parity] - 2026-05-16

Restores the upstream-parity invariant ("pull from `superhuman/mcp-mail`, never fork") that the prior "Skills polish" pass violated, and adds an extension-level routing layer that applies to every skill — current and future — without per-skill maintenance.

- **Reverted** local skill body edits. All five bundled `skills/<name>/SKILL.md` bodies now match upstream verbatim; frontmatter retains Raycast-specific metadata (`tools_used`, `read_only`, `upstream`, `upstream_sha`).
- **Added** an extension-injected routing prelude (`src/lib/skill-prelude.ts`) appended *after* every skill body returned by `run-skill`. Tells the AI to prefer `list-threads` over `query-email-and-calendar` for triage, surfaces the 16-char-hex thread ID format, and points at the new clickable `url` field. Position is intentional: recency-wins, so the prelude overrides any conflicting guidance in the upstream body. Opt-out via `skip_extension_prelude: true` in skill frontmatter (defaults false).
- **Added** clickable Superhuman thread URLs. `list-threads`, `get-thread`, and `get-message` responses now include a `url` field on every thread (`https://mail.superhuman.com/<user>/thread/<id>#app`). The user's email is resolved via the OIDC userinfo endpoint and cached for 30 days. The AI formats threads as `[Sender — Subject](url)` Markdown links so users can one-click into Superhuman.
- **Added** cross-cutting tool-routing guidance to `ai.instructions` — same rules as the prelude, so the AI sees them even outside a skill.
- **UI**: Browse Skills view subtitle now uses a `summarize()` truncation helper so the long upstream descriptions (multi-sentence trigger-phrase paragraphs) display cleanly. Full description still visible in the detail metadata.
- **Sync**: `scripts/sync-skills.ts` now writes upstream content to `tests/fixtures/upstream/<name>.md` on each run, so the new `skills-match-upstream` test stays offline.
- **Tests**: 28 new tests — `tests/skill-prelude.test.ts` (4), `tests/user.test.ts` (11), `tests/text-summarize.test.ts` (7), `tests/skills-match-upstream.test.ts` (6). Deleted `tests/morning-briefing-contract.test.ts` (was asserting on the local fork rules that have been reverted). 98 total, all passing.

## [Skills polish] - 2026-05-16

- **Fixed:** `tools_used` now flows through the cached / live resolver paths. The upstream `SKILL.md` frontmatter only declares `name` and `description`, so live and cached resolutions previously returned `tools_used: []`. The resolver now merges upstream content (body + declared fields) with the bundled SKILL.md's Raycast-specific metadata (`tools_used`, `read_only`, `upstream*`, `deprecated`), so `list-skills` and `run-skill` surface the real tool list regardless of source. The parser also accepts `tools` as an alias for `tools_used` and supports inline-array YAML (`[a, b]`).
- **Tightened:** `morning-briefing` skill now enforces the literal `[t_<id>]` prefix on every VIP / Action item, capped per-section bullet counts (≤ 10), aggregated `Likely noise` on a single line, and a *verify-before-returning* checklist. A new Vitest contract test guards the SKILL.md against future edits that quietly drop these rules.
- **Updated:** AI evals modernized for the post-parity tool schemas — `update-thread` uses `markDone` / `markRead`, `get-attachment` uses `attachmentName`, and the four free-text search evals now target `query-email-and-calendar`. One eval explicitly retained for the deprecated `search-inbox` alias as a backward-compat regression test. New eval pairs lock in non-empty `tools_used` on `list-skills` responses and the `[t_<id>]` format contract via `meetsCriteria`.

## [Skills surface rework] - 2026-05-16

### Fixed

- **Skills now execute as part of Raycast AI** instead of asking users to copy a prompt into Quick AI. The five separate root commands (`skill-morning-briefing`, …) have been replaced with a single **Browse Superhuman Mail Skills** view command, plus two new AI tools (`run-skill`, `list-skills`) so the same library is reachable from `@superhuman` in AI Chat.
- The Browse Skills view shows each skill with its description, the tools it chains, a read-only badge, and a source indicator (`bundled` / `cached` / `live`). Per-row actions: **Run with Raycast AI** (copies the prompt and opens AI Chat), **Copy Prompt**, **View Source on GitHub**, **View Tools Used**. Global actions: **Refresh from Upstream**, **Open Skills Repo**.

### Added — live skill updates

- New runtime resolver (`src/lib/skill-source.ts`) with a three-tier chain: LocalStorage cache (24h TTL) → GitHub upstream fetch (5s timeout) → bundled fallback. Updates to https://github.com/superhuman/mcp-mail/skills land for users without an extension release; the bundled fallback keeps the extension working offline and on first launch.
- New AI tools `run-skill` and `list-skills` use the same resolver, so the AI surface also benefits from live updates. `run-skill` accepts a slug (`morning-briefing`), a title (`Morning Briefing`), or a partial match (`briefing`); it returns the skill prompt, the tools it expects to chain, and `read_only_blocked: true` when the user's read-only preference would block the skill's writes.
- The existing build-time embed pipeline (`scripts/embed-skills.ts`) and upstream sync (`scripts/sync-skills.ts`) are unchanged — they're the bundled-fallback half of the equation.

## [Parity + Skills Library] - 2026-05-16

### Tool parity with the official MCP

Brings every tool wrapper up to parity with Superhuman's official MCP surface.

- `draft-email` now accepts `instructions` (the preferred AI-writer path that composes in the user's voice), `type` (new / reply / reply_all / forward), `threadId`, `messageId`, and `from` (alias). `body` remains as the literal-HTML bypass. Forward drafts require `body` for the intro — the server appends the quoted message.
- `send-draft` now supports mutually-exclusive scheduling: `smartSend`, `sendAt` (RFC3339), or `undoTimeout` (1–10 min). When `undoTimeout` is set, the response includes `undoToken` + `undoExpiresAt`.
- `undo-send` now accepts `undoToken` (preferred) in addition to the existing `messageId` fallback.
- `update-thread` now exposes `markDone`, `markRead`, `markStarred`, `markImportant`, `addLabels`, `removeLabels`, `moveToFolder`, `lastMessageId`. Old field names (`archived`, `read`, `starred`) are accepted as deprecated aliases.
- `mark-spam` now supports `alsoBlockSender`, `alsoBlockDomain`, `alsoTrash` flags for background bulk-spam sweeps.
- `create-or-update-event` now requires `timezone` (IANA) and supports `recurrence` (RRULE), `reminders[]`, `conference` (adds a video link), `calendarId`, `isAllDay` (renamed from `allDay`; legacy alias kept). Description is treated as HTML; times RFC3339.
- `get-availability` now resolves participant names → emails, requires `timezone`, defaults `workingHoursOnly` to true, and uses `startDate`/`endDate` (legacy `start`/`end` still accepted).
- `list-threads` now supports the full structured filter set: `from[]`, `to[]`, `subjectContains`, `bodyContains`, `labels[]`, `split` (name or id), `startDate`, `endDate`, `isUnread`, `isStarred`, `hasAttachment`, plus capped `limit` (≤ 50).
- `get-thread` now supports `includeComments`, `includeDrafts`, `messageLimit` (≤ 100; "root + newest N-1" truncation).
- `get-message` now supports `includeRawHtml`.
- `get-attachment` accepts `attachmentName` (replaces the legacy id-based selector). Inline content for images/audio, download URL otherwise with 1h expiry.
- `get-read-status-feed` now supports `threadId`, `since` (ISO), `cursor` pagination, `limit` (≤ 200).
- **New tool `query-email-and-calendar`** — flagship cross-source search/Q&A across email + calendar + contacts. `search-inbox` becomes a deprecated alias that delegates to it.
- `update-personalization` now takes a single freeform `feedback` string (matches the server's actual API). The old `fullName` / `signature` / `voice` / `greeting` fields were never the server's real schema; they have been removed. See `MIGRATION.md`.

### Skills Library

Ports Superhuman's [official Skills Library](https://github.com/superhuman/mcp-mail/tree/main/skills) into the extension as bundled `SKILL.md` files and as Raycast commands.

- Five skills: **Morning Briefing**, **End-of-Day Wrap-up**, **Meeting Scheduler**, **Deal Tracker**, **Batch Draft Writer**.
- Each is a `mode: "view"` Raycast command that renders the skill prompt and one-shot copies it to the clipboard for Quick AI.
- Each `SKILL.md` declares `tools_used` and `read_only` in frontmatter; skills that write are blocked when Read-only mode is on.
- `npm run sync-skills` pulls the latest upstream content, diffs, and updates frontmatter SHAs. A weekly GitHub Action runs the same job and opens a PR if anything changed.

### Safety

- **New preference: Read-only mode.** When enabled, every write tool (`draft-email`, `send-draft`, `discard-draft`, `undo-send`, `mark-spam`, `trash-thread`, `unsubscribe`, `update-thread`, `update-personalization`, `create-or-update-event`) throws a clear error and short-circuits its confirmation dialog. Read tools keep working.

### Validation & tests

- Every tool input is validated against a Zod schema at entry. Mutually-exclusive rules (send scheduling), conditional rules (forward drafts require body), and field-range caps (limits, undo window) are enforced in one place.
- Vitest suite (47 tests) covers parameter validation, the read-only gate, and skill-file integrity (every `tools_used` entry maps to a real MCP tool; every skill has a matching Raycast command).
- AI evals updated for the new params; new evals cover `instructions`-based drafts, `undoTimeout` sending, and `query-email-and-calendar`.

## [MCP Integration] - 2026-05-13

- Connect to Superhuman's official MCP server (`https://mcp.mail.superhuman.com/mcp`) via OAuth 2.1 (PKCE + Dynamic Client Registration).
- `draft-email` now creates a real draft server-side and returns a draft id (was: deep link only).
- `search-inbox` now returns inline results from `query_email_and_calendar` (was: deep link only).
- Added 17 new AI tools: `send-draft`, `discard-draft`, `undo-send`, `get-thread`, `get-message`, `list-threads`, `list-labels`, `list-splits`, `get-attachment`, `get-read-status-feed`, `mark-spam`, `trash-thread`, `unsubscribe`, `update-thread`, `update-personalization`, `create-or-update-event`, `get-availability`.
- Confirmation dialogs on destructive/sending tools (`send-draft`, `discard-draft`, `mark-spam`, `trash-thread`, `unsubscribe`, `create-or-update-event` with attendees).
- Migrated `ai.yaml` (instructions + evals) into `package.json` under `ai.instructions` / `ai.evals`; expanded eval coverage to one happy-path per new tool.

## [Initial Version] - 2025-04-29
