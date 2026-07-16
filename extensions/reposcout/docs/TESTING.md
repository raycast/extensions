# Testing

How RepoScout is tested, what is covered, and where the gaps are.

_Last updated: 2026-07-15 — v0.3.1_

## Tooling

- **Runner:** Vitest (`npm test`, `npm run test:watch`, `npm run test:coverage`).
- **Coverage:** v8 provider. Config in `vitest.config.ts`.
- **Static checks:** `npm run typecheck` (strict `tsc`), `npm run lint`
  (ESLint 9 flat config), `npm run format:check` (Prettier).
- **One command:** `npm run check` runs typecheck + lint + tests.

## Current status

- **158 tests across 26 files, all passing.**
- **~97% line coverage** of the tested core (`utils`, `filesystem`, `git`,
  `cache`, `indexer`, `ranking`, `search`, `preferences`, `actions`).

Run coverage locally:

```bash
npm run test:coverage
```

## What is covered

### Automated — unit (pure logic)

- `utils/`: path expansion/contraction/depth/list parsing; bounded-concurrency
  pool (order + limit); Result helpers; relative-time formatting.
- `search/fuzzy.ts`: tier ordering (exact > prefix > acronym > fuzzy), boundary/
  camelCase handling, contiguity, empty/no-match, score bounds.
- `git/remote.ts`: scp/ssh/https/git URL normalization + rejection cases.
- `git/info.ts`: metadata parsing via an injected runner (clean/dirty, detached
  HEAD, bare skip, total failure, bad timestamp).
- `ranking/`: decay + saturation math; every signal; weighted blend; pinned
  dominance.
- `cache/user-data.ts`: pure transforms (open/favorite/pin) + immutability.
- `filesystem/git-markers.ts`: normal/worktree/bare classification + precedence.
- `preferences/parse.ts`: defaults, clamping, expansion, editor validation.
- `actions/apps.ts`, `cache/paths.ts`: pure mappings.
- `actions/editor.ts`: installed-app resolution — bundle-id priority, name
  fallback, Xcode-is-not-VS-Code guard, and not-installed → null.
- `preferences/roots.ts`: normalize/add/remove/merge search folders — `~`
  expansion, order-preserving de-dup, and preference∪in-app union.

### Automated — integration (real filesystem / real git)

- `filesystem/discovery.test.ts` (temp trees): normal/bare/worktree detection,
  nested-repo non-descent, ignored dirs, `maxDepth`, symlink non-follow by
  default, **symlink cycle termination when following**, **unreadable-directory
  (permission) tolerance**, progress callback, abort signal.
- `filesystem/fingerprint.test.ts`: fingerprint changes with mtime; null when
  absent; bare-repo root reading.
- `cache/*.test.ts`: atomic write/read round-trips, missing/corrupt handling,
  schema-version mismatch, malformed-record filtering.
- `indexer/indexer.test.ts`: cold enrich-all, warm reuse (no re-enrich),
  targeted re-enrich on fingerprint change, dropped-repo handling, progress
  phases.
- `git/exec.integration.test.ts`: drives the **real `git` CLI** on a freshly
  `git init`-ed repo — branch/status/remote/last-commit, dirty detection, and
  the error branch in a non-repo. Skips gracefully if git is unavailable.

## Edge cases exercised (from the project spec)

| Scenario               | Where                                          |
| ---------------------- | ---------------------------------------------- |
| Nested repositories    | `discovery.test.ts` (non-descent)              |
| Broken repositories    | `git/info.test.ts` (all-fail → unknown/null)   |
| Bare repositories      | `discovery`, `fingerprint`, `git-markers`      |
| Symlinks (+ cycles)    | `discovery.test.ts`                            |
| Permission errors      | `discovery.test.ts` (chmod 000)                |
| Corrupted Git metadata | `git/info.test.ts`, `fingerprint` (null)       |
| Corrupted cache        | `cache/*` (corrupt JSON, bad schema)           |
| Large/huge trees       | iterative walker design; see performance notes |

## Manual testing (required before release)

These cannot be unit-tested because they depend on the Raycast runtime:

1. `ray develop` → open **Search Repositories**; confirm instant results from
   cache and live refresh.
2. Actions: Open in VS Code / Cursor / Finder / Terminal; Copy Path; Copy Remote;
   Open Remote on Web; Copy Branch.
3. Favorite / Pin toggles persist across command reopen and reorder results.
4. Folder picker: with no folders configured, use **Add Folder…** and pick a
   folder — it should be added immediately (toast + auto-return) and index, with
   no separate submit needed. Also confirm backing out of the picker without
   choosing anything is a no-op. From results, **Manage Search Folders** (`⌘⇧F`)
   adds/removes folders and re-indexes; preference folders show as read-only.
5. Preferences: change search roots, depth, ignored dirs, editor, terminal;
   confirm effects and that they union with in-app folders.
6. Background **Refresh Repository Index** runs on its interval and via the
   in-command action.
7. Scale: point at a folder with thousands of repos; confirm responsiveness.

## Known gaps

- No automated test drives the React components / Raycast runtime (excluded from
  coverage by design; verified manually). A future harness could use
  `@testing-library/react` against the components.
- `git/exec.ts` timeout path is not exercised automatically (would require a
  slow/hanging git). Low risk; the wrapper is thin.
- Performance is validated by design (iterative walk, bounded concurrency,
  fingerprint skipping) rather than by a benchmark test. A perf regression test
  over a synthesized large tree is a future addition (see BACKLOG).

## Regression policy

Every bug fix must add a test that fails before the fix and passes after. Every
new feature ships with unit tests for its pure logic and, where it touches the
filesystem or git, an integration test using the temp-tree helpers
(`tests/helpers/tmp.ts`) or the real-git pattern in `git/exec.integration.test.ts`.
