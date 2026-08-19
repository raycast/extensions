# Agent Instructions

## Working Style

- Read the codebase before making broad assumptions.
- Prefer the repo's existing patterns over introducing new abstractions.
- Keep changes scoped to the request and avoid unrelated refactors.
- Preserve user changes already present in the worktree.
- Verify meaningful changes with the repo's normal tests, type checks, builds, or focused smoke checks.

## Plans

Durable planning files belong in `plans/` at the repository root.

- Create `plans/` if a durable plan needs to be written and the directory does not exist.
- Name plan files with kebab-case and enough context to make them searchable, for example `plans/email-provider-migration.md`.
- Do not create new durable plan files under `~/.codex/plans`, `~/.claude/plans`, or other home-directory agent archives.
- Keep short in-chat plans in the conversation; only write a file when the plan needs to survive across sessions or be reviewed in the repo.
- When updating an existing plan, update the repo-local file rather than creating a duplicate elsewhere.

## Documentation

- Put repo-specific lessons close to the relevant files or in the repo's docs.
- Avoid documenting transient debugging notes unless they will help future maintainers.
- When adding setup instructions, include exact commands and note any required environment variables.

## Safety

- Do not run destructive commands such as `git reset --hard`, broad deletes, or production deploys unless the user explicitly asks.
- Do not commit secrets, tokens, local auth files, generated private state, or machine-specific config.
- Before changing deployment, database, billing, email, or auth flows, identify the verification path.

---

## Project specifics

Raycast extension. TypeScript, **npm** (Raycast Store CI requires `package-lock.json`; do not add `pnpm-lock.yaml` or `yarn.lock`).

### Commands

- `npm run dev` - launches `ray develop` (live-reload into the user's installed Raycast).
- `npx ray lint --fix` - type check + ESLint + Prettier in one pass. Run this before reporting work as done; there is no separate test suite.
- No CI yet. No tests.

### Folder convention (input data, external to the repo)

Projects live at `<projectsRoot>/<YYYY>/<MMDD_Name>/`. Each project folder *may* contain `Asana.html`, `Google_Drive.html`, `Frame_IO.html` — each is a single-line redirect with `window.location.href = "https://…"`. We parse the URL with a regex; the Asana URL is parsed again with `/task/(\d+)` to extract a task **gid**, which keys into Magic Link Machine.

### Magic Link Machine integration

We open `https://magicmachine.link/task/{gid}` in the user's browser. **Do not call MLM's HTTP API** even though it exists — MLM's folder creation runs through Apps Script in the user's authenticated browser session, so API calls can only write back URLs, not create the underlying Drive folder. See `docs/adr/0001-mlm-coupling-via-task-url.md`.

### Cache (Raycast `LocalStorage`)

- Per-HTML-file mtime is the invalidation key, not the project folder's mtime (Adobe apps touch the folder constantly — would invalidate the cache on every save).
- `useCachedPromise`'s persisted layer **JSON-serializes results**. Never return a `Map`, `Set`, `Date`, or class instance from a cached resolver — it'll come back as a plain object and silently break. Keep cached shapes serializable; derive lookups (e.g. `byPath` map) at render time via `useMemo`.

### Reserved Raycast shortcuts

`⌘A`, `⌘D`, `⌘F`, `⌘M`, `⌘P`, `⌘R`, `⌘Y` and other single-modifier `⌘+letter` combos are reserved by Raycast and will be silently stripped at runtime. Use `⌥⌘+letter` for the per-link actions in this extension.

### `useCachedPromise` deps must be stable

Passing `Array.from(map.keys())` or any freshly-allocated array as a dep causes infinite re-runs. Build a stable string key (sorted, joined) and pass that instead.

### Icons

Brand SVGs in `assets/` were copied from `magic-link-machine/page/public/assets/icons/`. If MLM's icon set changes, mirror the update here. The "missing link" state reuses the same SVG with `tintColor: Color.SecondaryText` — this only works because the SVGs are single-path; multi-color brand marks would flatten to grey on tint.

### Preferences shape

`projectsRoot` points at the **parent** of the year folders (e.g. `…/Binance`, not `…/Binance/2026`). The command discovers years matching `^\d{4}$`.
