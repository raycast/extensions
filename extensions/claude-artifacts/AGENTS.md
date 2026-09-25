# AGENTS.md

Notes for whoever works on this extension next, human or agent. Paths are repo-relative.

## What it is

A reader for a **local JSON index** at `~/.claude/artifacts.json`. **The extension makes no
network calls and has no API key.** If you are reaching for `fetch`, stop and read the
"Why not just call an API?" table in `README.md` — every avenue is closed, and three of them
are closed for legal or terms-of-service reasons rather than technical ones.

Two commands: **Search Artifacts** (`src/search-artifacts.tsx`) and **Run Doctor**
(`src/doctor.tsx`).

Two places hold reasoning that is not in the code: `docs/solutions/` collects writeups of
problems already solved here, filed by category with YAML frontmatter (`module`, `tags`,
`problem_type`) — relevant when you are working in an area one of them covers. `CONCEPTS.md`
defines the vocabulary the rest of these docs use without redefining.

## The data flow, and who writes what

```mermaid
Claude Code publishes an artifact
  └─ PostToolUse hook: scripts/record-artifact.sh   ← the ONLY routine writer
       └─ ~/.claude/artifacts.json
            ├─ src/utils/index-file.ts    reads it
            └─ src/utils/doctor.ts        appends to it (backfill only)
```

`scripts/record-artifact.sh` is registered by the user in `~/.claude/settings.json`; it is not
bundled and not installed by the extension. It lives in `scripts/` rather than `assets/` so it
can be read on GitHub before anyone installs it.

**Both writers share one kernel lock** (`~/.claude/artifacts.json.lock`, `perl -e flock`). If you
add a third writer, use that same lock — a second locking scheme excludes nothing. macOS ships no
`flock(1)`, and an mtime-based lockfile reaper cannot tell a dead holder from a slow one; see
`docs/solutions/design-patterns/lockfile-mtime-cannot-prove-liveness.md`.

Backfill (`src/utils/doctor.ts`) is **strictly append-only**: it adds rows whose `id` the index
lacks and never modifies or deletes an existing one. Keep it that way. The index holds seeded rows
that no transcript can reproduce, so anything that rewrites rows can destroy history.

## The gotcha that has already bitten once

Artifact URLs changed scheme around 2026-09-10:

```text
old  https://claude.ai/code/artifact/<uuid>
new  https://claude.ai/artifact/<22-char base62 slug>
```

The hook matched `[0-9a-fA-F-]{36}`, stopped recognizing its own payload, and — because its
contract is that it must **never fail a Claude Code turn**, so every failure path exits 0 —
silently recorded nothing for nine days while remaining installed, registered, and running.

**Match the shape of the URL; treat the id as opaque.** The `claude.ai/…/artifact/` prefix is the
stable part. Two places must stay in sync, and disagreeing produces duplicate rows rather than
missing ones:

|                   |                              |
| ----------------- | ---------------------------- |
| `URL_PATTERN`     | `scripts/record-artifact.sh` |
| `ARTIFACT_URL_RE` | `src/utils/transcripts.ts`   |

The index keys on the URL's **last path segment**, which survives a republish. Note that under the
new scheme it is _not_ the same value as `tool_response.artifact_id`.

The `Artifact` tool's response shape is undocumented. `docs/hook-payload.md` records what was
observed, with dates — treat it as an observation, not a contract, and re-run
`scripts/probe-artifact-hook.sh --report` if recording breaks again.

## Doctor's one non-obvious check

`Records Current Artifact URLs` **executes the user's installed hook** against a current-format URL
with `HOME` pointed at a temp directory, and checks whether a row came out. Every structural
check — installed, executable, registered — was green throughout the nine-day outage. Only
behavior could see it.

`HOME` is an environment variable, not a sandbox, so the self-test reads the script first and
refuses to run anything that does not derive its index from `$HOME`.

## House style

- Every `Toast.Style.Failure` carries a Copy Error action. Use `showError` from
  `@chrismessina/raycast-kit`; it has one by definition.
- Counts go through `countOf` from `@chrismessina/raycast-kit/plural` — never `${n} items`.
- Shortcuts use `Keyboard.Shortcut.Common` by semantics. `ray lint` does **not** check for
  collisions within an ActionPanel; assert that yourself by reading the resolved panel.
- No `any`. Never hand-define `Preferences`/`Arguments` — the ambient types are generated.
- `src/utils/` imports `@chrismessina/raycast-kit` via its **subpaths** (`/errors`, `/plural`).
  The root export reaches `@raycast/api`, which has no loadable runtime outside Raycast and would
  make those modules untestable in plain Node. That headless testability is load-bearing: it is
  how `diagnose()` and `backfill()` get exercised against real data.

## Gates

```bash
npx tsc --noEmit && npx ray lint && npx ray build
```

All three pass on types and syntax and tell you **nothing** about whether the feature works. Run
`npm run dev` and walk the empty, loading, error, and all-green states.

## 🚨 Before `ray publish`

**`ray publish` reads no ignore file** — not `.gitignore`, not `.git/info/exclude`. It copies the
extension root minus a hardcoded list (`.git`, `.github`, `.direnv`, `.swiftpm`,
`.raycast-swift-build`, `compiled_raycast_rust`, `compiled_raycast_swift`, `node_modules`,
`raycast-env.d.ts`). Verified in `node_modules/@raycast/api/dist/utils/publish/copy-dir.js`.

**Private notes go in `.github/.private/`.** That is the standard here, and it needs both halves
to work: the `.github/` prefix is what keeps it out of the Store monorepo, and a `.gitignore` entry
is what keeps it out of _this_ mirror, which is a public GitHub repo with the rest of `.github/`
tracked in it. Half of it is not privacy — a gitignored file at the repo root still ships, which is
how a handoff doc full of absolute machine paths reached `raycast/extensions#30530`.

Read the PR's full file list unfiltered before it merges:

```bash
gh api repos/raycast/extensions/pulls/<n>/files --paginate --jq '.[].filename'
```
