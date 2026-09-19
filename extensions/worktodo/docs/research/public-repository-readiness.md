# Public Store and repository readiness review

- Reviewed: 2026-09-05
- Store reconciliation: 2026-09-06
- Public-source baseline: `da2e890679ff1f1e1e8f01acd9e18892ff49b836`
- Public Store implementation starting point: `fe323c6ae4725ee5691b83cc3e9a10eed5464053`
- Store implementation commits: `534aa16`, `41c0ef9`, `2d99f3c`, `68ddf3e`, `3fe7b44`
- Scope: public Raycast Store packaging, metadata, documentation, source and dependency review, automated verification, native non-destructive acceptance, and local data handling. Store screenshots and publication are excluded.

## Current conclusion

No unresolved non-screenshot blocker was found for a public Raycast Store submission. The repository uses the public npm package contract, passes the complete verification gate without Store lint warnings, reproduces from a clean source archive, and has completed native non-destructive acceptance. The remaining release inputs are user-produced Store screenshots and a separately authorized publish action.

No publish command, Store pull request, repository visibility change, remote change, Git history rewrite, or screenshot creation occurred during this reconciliation.

The reachable Git history still contains a company author and committer email identified by the earlier public-source review. The owner excluded history rewriting and repository visibility changes from this initiative. That privacy choice applies to making the source repository public; it is not a functional or packaging blocker for the Raycast Store candidate.

## Store contract and resolved findings

| Finding                                                                                | Resolution                                                                                                                                                                                                                              | Evidence                                                 |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| The repository used pnpm while Raycast public CI requires an npm lockfile.             | Replaced the active package contract with npm 11.16.0, committed one root `package-lock.json`, removed the pnpm lock and workspace files, and changed active instructions and GitHub Actions to `npm ci` and `npm run verify`.          | `534aa16`, `3fe7b44`; working and clean-archive `npm ci` |
| The manifest carried an extension version and an older Raycast API.                    | Removed the manifest `version`, upgraded `@raycast/api` to 2.2.0, and retained individual public routing through `author: "jsn"` without `owner` or `access`.                                                                           | `534aa16`; public CI-mode Raycast lint                   |
| The default build combined Store and MCP concerns.                                     | `npm run build` now produces the Raycast distribution. `npm run build:mcp` remains separate, while `npm run verify` covers both. MCP-only packages are development dependencies and Raycast entry points do not import the MCP adapter. | `534aa16`; build and dependency review                   |
| Command and action copy did not follow Store Title Case guidance.                      | Adopted the exact command titles `All Tasks`, `Quick Add`, `Backup & Restore`, and `Worktodo Menu Bar`, added consistent `Worktodo` subtitles, converted actionable labels, and removed the lint override.                              | `41c0ef9`; copy tests; lint with no warnings             |
| The extension lacked a first-release changelog.                                        | Added an initial `{PR_MERGE_DATE}` changelog that describes shipped Raycast behavior without screenshot or MCP-installation claims.                                                                                                     | `41c0ef9`; metadata tests                                |
| Store users encountered developer setup before the product contract.                   | Reworked the README around first use, local data, privacy, backup and restore, differentiation, and the four commands. Node, npm, and MCP are clearly source-development or optional companion concerns.                                | `68ddf3e`; documentation and source review               |
| A rejected user-initiated cross-command launch could escape as an unhandled rejection. | The adapter now resolves after presenting one bounded failure toast. Background menu-bar refresh remains silent and best-effort.                                                                                                        | `2d99f3c`; 27 focused adapter tests                      |
| The original template icon and static menu-bar icon were not suitable product assets.  | Earlier implementation replaced them with a 512 x 512 Worktodo extension icon and a separate tintable menu-bar SVG.                                                                                                                     | Current assets, lint, and native light/dark inspection   |
| Unrepresentable timestamps could persist and break presentation.                       | Earlier implementation constrained domain, backup, MCP, and presentation boundaries to JavaScript-representable Unix milliseconds.                                                                                                      | `b79e95b`, `96f6c4d`                                     |
| A stale restore preview could replace newer data.                                      | Earlier implementation fingerprints the prepared snapshot and compares it inside the replacement transaction.                                                                                                                           | `ed6bb9b`                                                |
| Recovery publication lacked directory durability barriers.                             | Earlier implementation synchronizes the candidate file and relevant directories while preserving the current database on failure.                                                                                                       | `7f122d0`                                                |

## Automated verification

The final candidate was exercised under Node 24.18.0 and npm 11.16.0.

- `npm ci` succeeded twice in the working checkout without changing `package-lock.json`. Its SHA-256 remained `c7529f992df5a4f83f8a5b626df58d416fc33d56af069d1aa17965152e06508e`.
- A clean `git archive` extraction, with no local dependencies or generated files, passed `npm ci` and the complete `npm run verify` gate under the same Node and npm versions. Tracked files and the lockfile remained unchanged.
- The complete gate passed formatting, public CI-mode Raycast lint with no warnings, both TypeScript projects, 23 Vitest files with 202 tests, the four-entry-point Raycast distribution build, and the separate MCP build.
- `npm audit --json` reported zero known vulnerabilities across 265 dependency entries at reconciliation time.
- The production dependency graph contains `@raycast/api` and its transitives. MCP transport, client, and schema packages remain outside that production graph.
- Focused source scans found no Worktodo network request, external analytics or telemetry, Keychain access, child-process launch, opaque native executable, or MCP import reachable from `src` Raycast entry points. These bounded scans support the Store review; they do not claim a general proof that every dependency is risk-free.
- Existing disposable-database integration coverage remains the acceptance evidence for full replacement, stale-preview rejection, rollback, recovery publication, and injected durability failures.

`npm ci` emitted npm's informational native-build allow-list notice for optional install scripts. The tested platform packages were present and all builds and tests passed; no Store validation or tracked-file change resulted.

## Native Raycast acceptance

The built development extension exposed and opened all four declared commands with the expected Worktodo titles and subtitles.

- `All Tasks` was inspected in light and dark appearances. The task hierarchy, neutral incomplete circles, red priority treatment, details, and action copy remained readable.
- `Quick Add` created one uniquely named disposable task. Native editing changed its title, enabled priority, and assigned an all-day due date. The task was completed, observed in Completed, and reopened.
- `Backup & Restore` exported a version 3 JSON backup with owner-only mode `0600`. Restore preview validated that file, displayed current and incoming counts, and warned that replacement would affect all Worktodo data. The destructive `Replace Worktodo Data` action was not invoked.
- `Worktodo Menu Bar` launched and refreshed successfully. The command and task-driven background refresh paths remained operational and silent on failure by test. The current automation accessibility surface could not address the macOS status item itself, so no new popover interaction is claimed in this run; earlier recorded native inspection covers the theme-aware menu-bar icon, and focused tests cover its actions and visibility state.
- The system appearance was returned to light after the dark-appearance inspection.

The disposable task was removed by its exact recorded ID and final title. Post-cleanup checks found zero task or task-label residue, `PRAGMA integrity_check` returned `ok`, and `PRAGMA foreign_key_check` returned no violations. The exported backup and all Store-verification temporary directories were removed.

## Data, privacy, and recovery boundary

Production data is stored at `~/Library/Application Support/Worktodo/worktodo.sqlite`, with automatic recovery backups under the adjacent `Backups` directory. Worktodo requests owner-only permissions where supported. The SQLite database, exported JSON backups, and recovery backups are not encrypted by Worktodo.

The Store-facing Raycast path makes no Worktodo-authored external network request and includes no Worktodo analytics. Restore is replace-only after validation, preview, and confirmation; it is not a merge. A stale preview is rejected before replacement. The optional source-installed MCP server uses the same task service, and a separately configured MCP client can receive selected task content. Installing the Store extension does not install, register, or start that MCP server.

## Public-source baseline evidence

The earlier public-source review inspected 87 tracked files, 552 unique blobs across 79 reachable commits, available logs for nine GitHub Actions runs, and the Actions artifact inventory. Its bounded scans covered common provider tokens, private keys, credential assignments, credential-bearing URLs, email addresses, and personal home paths.

No credential-pattern match was found in tracked file content, commit messages, or downloaded Actions logs. No tracked database, environment file, generated build directory, personal backup, or Actions artifact was found. Generic `/Users/example` test fixtures were the only file-content home paths. Those scans reduce accidental-disclosure risk but cannot prove the absence of every possible secret format.

## Validation limits

- Store screenshots were explicitly excluded and remain user work.
- Publishing, authentication, Store review, and third-party rights or legal clearance were not performed.
- A destructive native restore was intentionally not run against the production database. Automated disposable-database suites provide that evidence.
- No power-loss or operating-system crash was induced for durability testing.
- Current automation could not operate the macOS menu-bar status item directly; the exact current-run boundary is recorded above instead of claiming an unobserved interaction.
- Repository publication and the reachable historical company email remain a separate owner decision outside this Store-readiness scope.
