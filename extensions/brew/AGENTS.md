# AGENTS.md

Working notes for anyone — human or coding agent — changing this extension. It
covers the decisions that are expensive to rediscover, not the parts the code
already explains.

## Commands

```
npm run dev     # ray develop — logs stream to the terminal
npm run build   # ray build -e dist
npm run lint    # ray lint   (npm run fix-lint to autofix)
npm test        # vitest run
```

The Vitest config is `vitest.config.mts`, not `.ts`: it uses ESM syntax and
Vite's native config loader warns on every run when that lands in a file it has
to treat as CommonJS.

`npm test` needs no network and no Raycast runtime. Two aliases in that config
make it possible: `@raycast/api` resolves to
`src/utils/__mocks__/raycast-api.ts`, and `@chrismessina/raycast-logger`
resolves to `src/utils/__mocks__/raycast-logger.ts`. The logger needs its own
stub because the real package is CommonJS and `require`s `@raycast/api` from
inside `node_modules`, where the first alias cannot reach it — without the stub,
importing _any_ module that logs fails to resolve, which is why `utils/cache.ts`
had no tests for so long.

## Paging is a sliding window, NOT `List` pagination

**Do not add Raycast's native `List` pagination to the Search command. It has
been tried twice and Raycast stops it both times.** Search does page — read on
for why it has to do it a different way.

Raycast caps a command at **100 MB** and refuses to page when it gets close,
with this in the dev log:

```
Refusing to paginate further as it could cause the command to run out of memory.
Currently using: 71.052MB out of 100MB (last page size increase was 30.969MB).
```

A full native `pagination={{ pageSize, hasMore, onLoadMore }}` implementation
was built and measured on 2026-09-13 against a warm cache with no index rebuild
in flight. It genuinely worked — the log shows `resultLimit` climbing 100 → 200
→ 300 and results widening to match — and then died:

| limit     | outcome                                        |
| --------- | ---------------------------------------------- |
| 100 → 200 | fine                                           |
| 200 → 300 | fine                                           |
| 300 → 400 | refused, 71 MB of 100 MB, last step cost 31 MB |

Three pages is where it ends. The command's floor is already ~35 MB: both
chunked indexes (8,597 formulae + 7,716 casks) live in memory, plus loaded
500-record chunks, the installed map, and React. Each further page adds the
records themselves, a fresh `useCachedPromise` entry for the new limit, and the
previous page retained by `keepPreviousData`.

This is not a bug in the paging code and it is not fixable by tuning page size —
a smaller page just moves where it stops. Raycast is measuring the whole
command, and this command's resident set is dominated by the search index rather
than by the page.

Related trap while diagnosing this: a **stale chunked index makes it look worse
than it is**. Rebuilding one parses `formula.json` (~31 MB) and `cask.json`
(~19 MB), which costs ~35–40 MB transiently and pushes the command to ~76 MB on
its own, before any paging. If the log shows `Chunked cache outdated` followed
by `Building chunked cache`, that memory is the rebuild, not your feature.
Measured A/B: bounding the chunk writes with backpressure does **not** help
(unbounded 35.4 MB growth vs. backpressured 39.5 MB) — the cost is the parse,
not retained chunks. That change was tried and reverted; do not retry it.

**What the extension does instead: a sliding WINDOW.** `brewSearch` takes an
`offset` as well as a `limit`, and paging forward moves the window rather than
extending it — page 40 loads exactly as many records as page 1, because the
previous page is dropped. Memory is flat, so the ceiling is never approached and
all 78 pages of casks stay reachable. See `src/utils/paging.ts`.

The distinction is the whole point: **native `List` pagination is append-only**,
which is why it cannot work here. Anything that accumulates pages hits the cap
again.

Each windowed section ends with a footer row — _"101–200 of 7,716 casks / Page 2
of 78"_ — whose primary action is Next Page, and `PagingSection` puts the same
navigation (⌘↓ / ⌘↑ / ⌘⇧↑ / ⌘⇧↓, the last two `Common.MoveUp`/`MoveDown`) in
**every** row's action panel so paging never requires scrolling to the bottom
first. The dedicated page/home/end keys would read better, but no laptop
keyboard has them, so those bindings were unreachable for most users.

That row has already been got wrong twice, so keep both in mind:

- It had an **empty title** and a dot icon, which reads as a broken Load More
  control. Keep it self-explaining.
- It wrote a full sentence regardless of width. With the metadata sidebar open
  the list column is under half the window, so it clipped to _"Showing 100 o…
  Keep typing to…"_ — which says nothing. It now drops the noun and the hint
  when the sidebar is visible and keeps the numbers, which carry the meaning.

## `totals`, and why not `totalLength`

`InstallableResults.totals` carries how many matched before the limit truncated
the arrays. The result arrays _also_ carry a `totalLength` expando, and that one
is **not trustworthy across the cache**: `useCachedPromise` persists through
`JSON.stringify`, which keeps array elements and silently drops extra array
properties. A result served from the disk cache therefore has no `totalLength`
at all, and anything asking "is this truncated?" answers no. Read `totals`.

## Versions and what `brew` actually reports

- **`versions.stable` is not the version on offer.** A formula can be rebuilt
  against the same upstream version — a _revision_ bump — which Homebrew records
  in a separate `revision` field and renders as `2026.8.19_1`. Composing the two
  is `brewAvailableVersion` in `src/utils/brew/helpers.ts`. Reading `stable`
  alone printed the installed version on both sides of the arrow.
- **The search index strips `revision`.** Only `brew info` output carries it, so
  `applyInstalledStatus` in `src/hooks/useBrewSearch.ts` copies it across the
  same way it copies `outdated`.
- **`installed` is ordered oldest-first.** With several kegs, `installed[0]` is
  the superseded one; `linked_keg` names the active one. `brewInstalledVersion`
  prefers it.
- **`outdated` is only as fresh as the last `brew update`.** A package installed
  at the newest version brew currently _knows about_ reads as up to date however
  stale the tap checkout is. That is what the per-package **Check for Updates**
  action exists for (`brewCheckForUpdate` in `src/utils/brew/fetch.ts`): the
  refresh is unavoidably global, but the re-read afterwards is one `brew info`.
- **`brew outdated <name>` exits 1 when the package IS outdated.** `execBrew`
  throws on a non-zero exit, so use `brew info --json=v2 <name>` to ask about one
  package.

## Single-package upgrades

Everything that upgrades one package goes through `upgradeChecked` in
`src/components/actions.tsx`. It reads Homebrew's **pin directory** rather than
the payload's `pinned`, because a pin set in another command or from the CLI is
real whatever the cached snapshot says, and `brew upgrade` errors rather than
warns when handed a pinned package.

It returns a three-way outcome, and the distinction matters: `skipped` means
something declined the package (a pin, or brew reporting it disabled or already
current) and a status-tracking view should mark the row skipped; `aborted` means
we could not get far enough to decide, which is already reported and must not be
restated as a per-package verdict.

## Dependency notes

- **`stream-json` must stay on 3.x.** 1.9.1 carried GHSA-528h-pc64-c93x (the
  path filters are O(depth²), so crafted nested JSON stalls the event loop), and
  there is no 1.x or 2.x backport — 3.5.0 was the first fix. `buildChunkedCache`
  uses the affected `filter()` on downloaded JSON, so this is the hot path.
- **Import stream-json subpaths kebab-cased and with the extension** —
  `stream-json/filters/filter.js`, not `stream-json/streamers/StreamArray`. 3.x
  resolves only through its `exports` map and the old PascalCase paths are gone.
- **Do not add `@types/stream-json` back.** It still describes 1.x, so it makes
  the dead PascalCase specifiers type-check clean while they fail at runtime.
  3.x ships its own types.
- **`tsconfig.json` needs `module: esnext` + `moduleResolution: bundler`** for
  those subpaths to resolve; the old node10 resolution ignores `exports` maps.
  esbuild still emits CJS for `ray build` — this governs type resolution only.
- **`npm install` of vitest 4 crashes npm 10's arborist** ("Cannot read
  properties of null (reading 'edgesOut')", in `#loadPeerSet`). Use
  `npx -y npm@11 install …` for that one. Do NOT delete `package-lock.json` to
  work around an install error: regenerating it from scratch on one machine
  drops every other platform's optional binaries. Restore it with
  `git show HEAD:package-lock.json > package-lock.json` and let `npm install`
  update it surgically instead.

## Conventions to keep

- **Sidebar and pushed Details metadata is defined once**, as data in
  `src/components/packageMetadata.tsx`, rendered by one parameterised renderer
  for both Raycast namespaces. Adding a row means editing one place; the two
  views were once written out separately and drifted three times.
- **The semantic colour and icon vocabulary lives in `src/components/palette.ts`**
  with the colour meanings documented (green up to date, blue in progress or
  informational, red failed, orange needs attention including update available,
  yellow LOW severity only, secondary skipped or not installed). It owns
  the whole table, not just install state: `STATUS_COLOR` names those meanings,
  `SEVERITY_COLOR` maps advisory severity onto them, and the shared icons
  (`UP_TO_DATE_ICON`, `UPDATE_AVAILABLE_ICON`, `ERROR_ICON`, `IN_PROGRESS_ICON`,
  `WARNING_ICON`, `UNINSTALLABLE_ICON`, `NOT_INSTALLED_ICON`, `vulnerableIcon`)
  live beside them. Import a meaning from here rather than hardcoding `Color.*`.
- **`src/utils/brew/version.ts` refuses to rank version shapes it cannot order.**
  Plain dotted numbers only; prereleases, dates, `latest` and `HEAD` return
  `undefined`. Three attempts at a general comparison were wrong before it
  stopped guessing. It is also import-free on purpose: `npm run check:analytics`
  bundles it under plain Node, so the `brew --version` wrapper lives in the
  sibling `src/utils/brew/brew-version.ts`.
- **Two dev-only checks, neither ships.** `npm test` is offline and fast.
  `npm run check:analytics` runs the analytics-parsing fixtures **plus three
  live requests to formulae.brew.sh**, so it fails with `ENOTFOUND` offline —
  by design, since it verifies the API contract a fixture cannot.
- **Green `tsc` / `ray lint` / `ray build` are not a review.** Every defect that
  reached review on this extension passed all three. What caught them was an
  adversarial second-engine review of each change plus screenshots of the
  running command. Run one before calling anything done.

## Things that will bite

- **`ray publish` reads no ignore file.** Not `.gitignore`, not
  `.git/info/exclude`. It copies the extension root minus a hardcoded list
  (`.git`, `.github`, `node_modules`, build output, and a few others). Anything
  that must not ship has to live outside the extension root. A `HANDOFF.md`
  excluded via `.git/info/exclude` shipped to the public monorepo this way.
- **Toast handles act on whichever toast is visible.** `hide()` and the update
  helpers carry no toast id, so hiding "ours" can dismiss someone else's. Settle
  an animated toast by _replacing_ it with `showToast`, not by mutating it. See
  the comment above `settle` in `src/utils/toast.ts`.
- **The single-package `brew info` fetchers swallow every error** and return
  `undefined` — a genuine not-found and a failed read are indistinguishable. Do
  not report `undefined` as "Homebrew no longer has this package".
- **`brewSearch` slices before loading chunks.** That ordering is the memory
  optimisation the whole chunked cache exists for; do not load first and slice
  after.

## Homebrew 7 features

Three surfaces need Homebrew 7, gated two different ways. **Show
Vulnerabilities** and **Run Doctor** (entry points `src/show-vulnerabilities`
and `src/run-doctor`) render a `RequiresHomebrew` view instead of the command.
Cask link/unlink (`src/components/actionPanels.tsx`) is simply omitted from the
action panel below Homebrew 7 — there is no explanatory view, because a missing
action in a panel full of working ones is not worth one. Nothing else is
gated.

The pattern is `useBrewMajorVersion()` compared against `HOMEBREW_7`, falling
back to `<RequiresHomebrew major={HOMEBREW_7} feature="…" onUpdated={revalidate} />`.
`onUpdated` matters: the gate's own "Update Homebrew" action calls
`invalidateBrewMajorVersion()` and then this, so the command re-renders into the
real view without a relaunch.

`confirmAndRun` (`src/utils/brew/confirmAndRun.ts`) runs **arbitrary shell
strings verbatim** — not `brew …` — because Doctor's remediations include
`sudo chown` / `chmod`. It uses `execBrewEnv()` so sudo picks up the shipped
askpass, and prepends the configured brew `bin` to `PATH` so a bare `brew` in a
remediation resolves off `customBrewPath` rather than whatever was inherited. It
appends the command list to the alert body itself, so **callers pass prose
only** — never re-list the commands in `message`. `toastTitle` exists because
the alert title can be a full sentence and a toast cannot.

Exit status 1 with a populated stdout is the **normal** case for both
`brew doctor --json` and `brew vulns`: any finding sets `Homebrew.failed`
before the JSON is written. `brewDoctor`/`brewVulns` in
`src/utils/brew/actions.ts` parse `err.stdout` on code 1 rather than throwing.

The install preview (`brewInstallDryRun`) sets `HOMEBREW_NO_AUTO_UPDATE=1` so a
read-only preview never triggers the first `brew update` of the day, and
`HOMEBREW_NO_ENV_HINTS=1` because brew otherwise prints a two-line hint on
STDOUT *inside* the dependents block, which the line parser reads as fourteen
extra packages.

Installability (`src/utils/brew/installability.ts`) is **never marked on a
guess**: an unknown operator, requirement name, version string or host all read
as installable, since a false ⊘ hides a package the user could have had. Only
the `test` context is ignored. `disabled`, OS-family, macOS-version and arch
constraints all mark "Can't Install".

The chunked cache has **one** version rule: changing `valid_keys` in
`src/utils/cache.ts` means bumping `CHUNKED_CACHE_VERSION` in the same edit,
because a stripped field that a reader expects is indistinguishable from a
missing one. A bump forces every user to re-download the full index, and an
offline user retries it on every launch until they are back online — so bump
deliberately, not defensively.
