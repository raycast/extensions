# AGENTS.md

Guidance for coding agents (and people) working on this extension.

## Commands

```bash
npm run dev          # ray develop — live-reloads into the local Raycast app
npm run build        # ray build
npm run lint         # ray lint (ESLint + Prettier)
npm run fix-lint     # ray lint --fix — run before every commit
npm run publish      # npx @raycast/api@latest publish — submits to the Raycast Store
```

There is no test suite and no test runner. Verification is `npm run build` + `npm run lint` + manual exercise in `ray develop`.

`npx ray lint --fix` must pass before committing: the publish pipeline enforces both ESLint and Prettier, and skipping it causes publish failures that need extra fix commits.

## Architecture

Two commands over one shared data pipeline:

- **`view-store-updates`** (`mode: view`) — the main list, merging the Store feed and the merged-PR list into one chronological view of new, updated, and removed extensions.
- **`store-updates-menu-bar`** (`mode: menu-bar`, `interval: 1h`) — a badge of unseen items, refreshing in the background.

Both route their PR fetch through `fetchMergedPRs()` and both call `convertPRsToStoreItems()`. The menu bar wraps these in `scanStoreUpdates()`, which differs in two ways: **new** items are built from feed fields directly (no per-item `package.json` fetch, because it runs hourly and unattended), while **updated** items still enrich through `convertPRsToStoreItems()`; and removed items are omitted entirely — the badge surfaces things to discover, not removals.

### Data sources → item types

`StoreItem` (`src/types/index.ts`) is the unified shape everything is normalized into, discriminated by `type: "new" | "updated" | "removed"`.

| `type`    | Source                                                                        | Path                                         |
| --------- | ----------------------------------------------------------------------------- | -------------------------------------------- |
| `new`     | `https://www.raycast.com/store/feed.json` (official JSON feed)                | `useFetch` in the command, enriched per-item |
| `updated` | Merged PRs from `raycast/extensions` (GitHub API, `state=closed&per_page=50`) | `convertPRsToStoreItems()`                   |
| `removed` | The same PR list, classified by `isRemovalPR()` and confirmed by a 404        | `convertPRsToStoreItems()`                   |

Metadata the feed and the PR API do not carry — `platforms`, `version`, `categories`, the extension `icon`, and for updates the `title` and `owner` — comes from each extension's `package.json` on `raw.githubusercontent.com/raycast/extensions/main/extensions/{slug}/package.json`. Coverage differs by stream: **updated** items take title, owner, and icon from it; **new** items in the main list keep the feed's own title, author, and image and add only platforms, version, categories, and icon; **new** items in the menu bar are not enriched at all (see above); **removed** items fetch nothing, since the file is gone, and carry a placeholder `platforms: ["macOS"]`.

### The slug problem

Almost all complexity in `src/utils/index.ts` exists because **a merged PR does not tell you which extension it belongs to**. Resolution is a cascade:

1. `parseExtensionSlugFromPR()` makes a first guess, trying in order: an `extension: name` label, a `Name: description` title (rejecting conventional-commit prefixes like `fix`/`feat`/`chore`), a `[Name] description` title, an `ext/<slug>` head branch, and an `Add <name> extension` title.
2. `fetchExtensionPackageInfo()` checks the guess. If `package.json` does not resolve, other `extension:` labels on the PR are tried — and only labels, because a branch or title that happens to name a real extension proves the extension exists, not that the PR belongs to it.
3. `fetchExtensionSlugFromPRFiles()` is the last resort: it fetches the PR's file list and takes the slug with the most changed files under `extensions/{slug}/`. It is billed, so it only runs while the per-scan budget lasts (see Rate limiting).

If all three miss, the item is **still emitted** under the first guess, with a title derived from the slug and the PR author's avatar as its image — a possibly-wrong Store link was judged better than silently dropping the update.

**Do not use `fetchExtensionPackageInfo()` to confirm a removal.** It returns `null` on _any_ failure (its `!response.ok` branch covers 500/502/429) and caches that miss for 15 minutes, so one transient blip would display a live extension as "Removed" and keep doing so. `isExtensionGone()` exists for this: a `HEAD` request where **only an explicit 404 counts**.

Removal detection is deliberately conservative. `isRemovalPR()` (the `no-review` label or a `^removed?\b` title) flags a candidate — loosely, and most candidates are not removals at all ("Remove outdated screenshots from … README", "Remove contributor …"). The slugs to check come from the PR's `extension:` labels when it has any, for free; only an unlabeled PR (such as a staff bulk removal, "Removed two extensions") spends a billed `fetchRemovedSlugsFromPR()` call, which requires that every file under `extensions/{slug}/` _on the first page of the PR's file list_ (100 files; it does not paginate) has status `"removed"`. Either way, `isExtensionGone()` then confirms with a definitive 404, and that is the actual proof: a slug that still resolves is dropped, not reported as removed — which is also how the false candidates cost nothing. One removal PR can emit multiple `removed` items — one per slug.

The removal pass runs **before** the update fallbacks, so it gets first claim on the shared `/files` budget. A starved update keeps its title-derived slug and still shows; a starved removal would vanish without a word, indistinguishable from "nothing was removed". Measured 2026-09-22 against real PRs, tokenless: with six unnameable update PRs ahead of them, the previous ordering reported **none** of three genuine removals (`authy`, and `associated-press` + `bnf-search-tool` from one bulk PR); this ordering reports all three within the same five calls. The residual gap is a single scan containing more unlabeled removal PRs than the budget allows.

### New-vs-update deduplication

**One update per extension, and it is the newest merge.** The PR list is fetched with `sort=updated` — last activity, not merge date — so a comment or label on an old PR moves it to the top, and 12 of 42 merged PRs in one measured window (2026-09-22) had merged over a week earlier. First-seen-wins let Hide My Email's Sep 2 PR hide its Sep 22 update. `convertPRsToStoreItems()` therefore keeps whichever PR merged latest, compared explicitly, across both the first pass and the file-fallback pass (sorting the input would not cover a PR whose slug is only learned in the second pass).

An extension's first publish appears in _both_ the feed and the merged-PR list. `convertPRsToStoreItems()` takes a `newItemDates` map (slug → feed publish date) and skips any PR whose `merged_at` is **not newer** than the feed date. Nothing makes the PR conversion wait for the feed: it can first run with an empty map, in which case an extension's first publish briefly shows as an update, and it then re-runs once the feed is processed. That re-run is keyed on `newItemDatesSignature` — a memoized string whose identity changes only when the (slug, date) set actually changes, so the network-bound `convertPRsToStoreItems()` does not re-run every time the feed merely reloads.

### Filtering pipeline

`displayItems` in `src/view-store-updates.tsx` applies these in order:

1. **Dropdown filter** (`all` / `new` / `updated` / `my-updates` / `removed`), persisted via `storeValue`.
2. **Platform toggles** — cross-platform extensions are _never_ hidden; the toggles only affect platform-exclusive ones. `removed` items are exempt, because their `platforms` value is a placeholder rather than real data. `useFilterToggles` guarantees at least one platform stays enabled.
3. **Category** and **author** filters, set from the action panel.
4. **Read state** — only when the `trackReadStatus` preference is on.

`my-updates` reads installed extensions via `fetchInstalledExtensionSlugs()`, which lists `~/.config/<config-dir>/extensions/` and reads the `name` from each folder's `package.json` — that `name` is the extension's slug, for Store installs (folders named by UUID) and `ray develop` builds (folders named by slug) alike, so nothing is resolved over the network. The config-dir name comes from the running build's bundle id in `environment.supportPath`: `com.<product>.<platform>[.<variant>]` becomes `<product>[-<variant>]` (`com.raycast.macos` → `raycast`, `com.raycast-x.macos` → `raycast-x`). This approach is borrowed from the published `installed-extensions` extension; that one rule reproduces all twelve entries of its bundle-id table.

**Do not read `~/Library/Application Support/com.raycast.macos/extensions/` for this.** It looks like a registry and is not one: Raycast creates an extension's folder there the first time the extension _runs_ (it holds `supportPath` and the `Cache` store), so an extension that is installed but has never been opened is absent, and its updates were filtered out of My Updates. Store folders there also contain no `package.json`, which forced a Store-API lookup to turn UUIDs into slugs. (Verified 2026-09-22: Hide My Email was installed, never run, and missing from that folder, but present in `~/.config/raycast/extensions`.)

It returns `Set | null`, and the distinction is load-bearing: `null` means "could not tell" and both surfaces then stop filtering, so an empty `Set` would mean "nothing installed". Returning an empty set on failure is what once made this fail closed and silently show no updates at all. It returns `null` when the bundle id is unrecognized, when the folder is missing or unreadable, when any extension's `package.json` exists but cannot be read, parsed, or has no `name` (a half-written install, say — skipping it would hide that extension's updates), and when the result does not include the running extension itself (`environment.extensionName`) — which is necessarily installed while it runs, so its absence means the wrong folder was read. That self-check is also why an empty `Set` cannot occur in practice. An entry with **no** `package.json` is not an extension and is skipped rather than treated as a failure: the folder always contains Raycast's shared `node_modules`, and can hold manifest-less leftovers and stray files.

The lookup is keyed on the dropdown filter and a nonce that Refresh bumps, so Refresh re-resolves installed extensions rather than keeping the Set from when the filter was first selected.

### Changelog view

"View Changelog" fetches the extension's `CHANGELOG.md` from `raw.githubusercontent.com` (`src/hooks/useChangelog.ts`) and renders it as a Version History list (`src/components/ChangelogDetail.tsx`) — one row per version, notes in the detail pane. The Raycast Store renders its own version history from the same file (its headings are the CHANGELOG headings with the brackets stripped), and there is no public JSON changelog endpoint, so parsing the file is the whole approach.

`parseChangelog()` in `src/utils/changelog.ts` makes one row per `##` heading, in file order — changelogs are written newest-first by convention, but nothing sorts them. Anything before the first `##` is not shown as a row; it only survives in "Copy Changelog". The heading rule is `##` then any whitespace except a line break, which admits the non-breaking space some changelogs use; `extractLatestChanges()` (behind "Copy Latest Changes") uses the same rule, so it always copies the top row. The date is optional and lenient on purpose: in that same 250-file sample (868 headings, every one parsed to a row), headings appear with no date, without brackets (`## 1.1.0 - 2023-01-31`), with single-digit days (`2023-11-5`), with a parenthesized date, and with misspelled placeholders (`{PR_MREGE_DATE}`) — a strict pattern silently drops those sections, bullets included, or leaves the date glued to the title. Dates are built from their numeric parts, because `new Date("2023-11-5T00:00:00")` is an Invalid Date — a truthy object that passes every `if (date)` check — and an impossible date like `2023-02-31` is rejected rather than rolled into March. Any `{UPPER_CASE}` placeholder is treated as undated. A file with no `##` headings falls back to rendering the raw markdown in a `Detail`, never an empty list.

Row icons are purely positional: the last row always gets `Rocket`, including when it is the only row (111 of the 250 sampled changelogs); the top row gets `CheckCircle` unless it is also the last; every row between gets `ArrowClockwise`. In a newest-first changelog that puts the rocket on the initial release and the check on the latest. All are `Color.SecondaryText`. Across a random 250 of the monorepo's changelogs, the last row was the initial release in 247; matching the word "Initial" instead missed 50 initial releases (headed `1.0.0`, `Added Extension to Store`, …) and fired mid-list in 2. The 3 misses are files written oldest-first, where the rule inverts (the rocket lands on the latest version) because nothing here re-sorts. Keying glyphs off heading vocabulary (Improvement / Fix / BugFix / Feature / free prose) was tried first and produced a column of mismatched icon weights.

Each row carries its own `ChangelogActions` with that version passed as `selectedVersion`, which is what lets "Copy Changes" copy the row you are on. The `List` itself carries the same panel too, without a selected version, because when no row is selected — while loading, or when a search matches nothing — Raycast shows the List's actions instead.

"Open Commit in Browser", "Copy Commit URL", and "Copy Commit SHA" link a version row to the `raycast/extensions` commit that added it. `src/hooks/useChangelogCommits.ts` reads the file's newest 20 commits from GitHub's Atom feed (`github.com/…/commits/main/extensions/{slug}/CHANGELOG.md.atom`, cached 15 minutes), then reads the file at each of those commits, and at the oldest one's parent (`<sha>~1`), from `raw.githubusercontent.com`. A commit never changes, so each read is cached with no expiry, though Raycast's `Cache` still evicts least-recently-used entries past 10 MB. None of it touches `api.github.com`, so browsing changelogs cannot spend the quota the update scan depends on. `attributeVersions()` in `src/utils/changelog.ts` then pairs rows with commits by content. Nothing touches the file between two consecutive commits in its history, so a commit added exactly the titles it holds that the next-older state lacks. Titles, not dates, are compared, so the commit that stamps `{PR_MERGE_DATE}` adds nothing, and repeated titles are counted as a multiset. A row whose heading text was edited later pairs with the commit that made that edit, where its current text first appeared. A row older than the 20 commits has no commit actions, unless its current text first appeared within them. Nothing is paired unless the displayed rows exactly match the newest commit's titles, because the feed can lag the displayed file. A title repeated in the file ("Update") is paired only when the file's dates show it is newest-first. A failed read of one commit also hides what the next-newer commit added, so pairing stops before both. Measured 2026-09-24 against the commit diffs, over 301 headings in 60 extensions: every one paired correctly. The first design paired rows to commits by merge date. It got 279 right and 3 wrong, all headings whose author had typed a date by hand, and it spent a billed API call per changelog.

### Rate limiting

**Only `api.github.com` is billed.** `raw.githubusercontent.com` is separate infrastructure and free — that asymmetry is the lever the whole design pulls on, so keep enrichment on `raw.*`.

Without the optional `githubToken` preference the budget is 60 req/hr per IP, shared across both commands. `fetchMergedPRs()` in `src/utils/index.ts` is the single entry point and picks exactly **one** transport: GraphQL when the user opted in _and_ supplied a token, REST otherwise and on any GraphQL failure.

> The view command uses `useCachedPromise`, **not** `useFetch`. `useFetch` issues the request itself and only then calls `parseResponse`, so a GraphQL branch there would run _after_ a REST call had already been spent — paying for both. Whatever owns the transport choice must also own the request.

Two cost controls, both load-bearing:

- Slug guesses come from fields already in the PR list response (labels, title, head branch), so most PRs resolve with no extra billed request. When the first guess misses, only an `extension:` label is trusted to _replace_ it — a branch name matching another extension would otherwise produce the wrong Store URL.
- `createFilesBudget()` caps billed `/pulls/{n}/files` calls per scan (5 tokenless, 50 with a token). Every caller draws on the same allowance, removals first (see above).

A 429 is always a rate limit. A 403 is only treated as one when GitHub also reports `X-RateLimit-Remaining: 0`; a bare 403 is a proxy/VPN rejection and must not start a cooldown. Without a reset header the cooldown is 5 minutes, never a fabricated hour.

See `docs/api-cost.md` for the measurements behind all of this.

State in `LocalStorage`: `read-items`, `filter-toggles`, `github-last-fetch-time`, `github-rate-limit-reset`.

Separately, `src/utils/store-cache.ts` uses Raycast's synchronous `Cache` (namespace `store-updates-menu-bar`, keys `items` / `last-seen`) so the menu bar's first render can show the previous scan instead of flickering empty. A cold or unreadable cache still yields `[]`, and the menu bar shows its loading state.

## Conventions

- `.prettierrc` is the Raycast scaffold standard (`printWidth: 120`, `singleQuote: false`). An import-sort plugin was once configured here but is **not** in `devDependencies` — re-adding the config without the dependency breaks `ray lint`.
- Keyboard shortcuts prefer `Keyboard.Shortcut.Common.*` (`Open`, `Copy`, `Refresh`, `MoveUp`, `MoveDown`) over hand-rolled modifier objects. Choose them by meaning, and leave secondary actions unbound rather than handing out nearby constants (`CopyName`, `CopyPath`, `CopyDeeplink`) to fill a panel: in the changelog panel the only copy action with a shortcut is "Copy Changes" (`Common.Copy`); the others are bound only to the navigation (`MoveUp` / `MoveDown`) and open (`Open`) constants their meaning calls for. `ray lint` does not check for two actions in one panel sharing a shortcut, so check that by reading the panel.
- Platform icons are `assets/platform-macos.svg` / `platform-windows.svg`, tinted via `MACOS_TINT_COLOR` / `WINDOWS_TINT_COLOR` from `src/utils`. macOS uses the theme-aware `Color.PrimaryText` — a hex tint (it was `#000000CC`) renders the glyph nearly invisible in dark mode, and `fill="currentColor"` in the asset does **not** fix that. Extension icons go through `extensionIconImage()` so the list and menu bar cannot drift apart.
- Enrichment helpers in `src/utils` swallow errors and return `null` / `[]`. This is intentional: a failed enrichment fetch degrades one list item rather than blanking the whole list. `fetchMergedPRs()` is deliberately different — it throws, so the caller can tell a rate limit from an empty result and keep the previous list on screen. **The exception is anything used as a filter** — `fetchInstalledExtensionSlugs()` must return `null` on failure, never an empty or partial set, because a filter that fails closed looks exactly like "no updates".
- `// eslint-disable-next-line @raycast/prefer-title-case` is required on the "macOS-only" / "Windows-only" action titles — the linter wants title case, but the platform names are correct as written.
