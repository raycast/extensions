# Performance & Correctness Findings

Investigation of two reported problems in the **GitHub Pull Requests** Raycast extension:

1. The menu-bar badge fails to refresh from the view command — **works in `ray develop`, breaks in the Store build**.
2. **View Pull Requests** is slow on first load.

Status of each claim is marked: **CONFIRMED** (verified against code or primary docs), **HYPOTHESIS** (consistent with docs + code, not yet reproduced), or **PENDING**.

---

## 1. Menu-bar refresh fails in Store builds

### The existing fix targets the wrong failure

`/Users/messina/Developer/GitHub/chrismessina/gh-pr-tracker/src/unread-updates.tsx:90-94` documents the current design rationale:

> The computed list is passed via launchContext (not just a "refresh" flag) so the menu-bar command can render synchronously from it. A background-launched menu-bar command only gets a short execution window; if it had to await an async cache read before rendering, that read would race the window and the badge would keep its stale value (observed in Store builds, whose window is tighter than local development's).

The execution-window constraint described here is real. But it does not explain a dev-vs-Store difference, and passing data through `launchContext` does not clear the gate that most likely causes it.

### Root cause — HYPOTHESIS

Two documented behaviors combine:

**(a) Background refresh is disabled by default for Store installs.** From [Background Refresh](https://developers.raycast.com/information/lifecycle/background-refresh):

> When a user installs the command via the Store, background refresh is initially *disabled* and is activated either when the user opens the command for the first time or enables background refresh in preferences.

**(b) `launchCommand` throws when the target is not enabled.** From [Command](https://developers.raycast.com/api-reference/command):

> Launches another command. If the command does not exist, or if it's not enabled, an error will be thrown.

Precedent: [raycast/extensions#4181](https://github.com/raycast/extensions/issues/4181) — commands fail with `No enabled command 'index' found` when the target menu-bar command is disabled.

In `ray develop`, the menu-bar command has been launched manually many times and is always activated, so the throw never fires. In a fresh Store install where the user has not yet opened the menu-bar command, `launchCommand` throws.

**The throw is invisible.** `src/unread-updates.tsx:103`:

```ts
} catch {
  // menu-bar command may be disabled; ignore
}
```

This is why the failure has no diagnostic trail. Confirming this hypothesis requires instrumenting that catch — see §3.

### Secondary defect — CONFIRMED

Independent of the above, the menu-bar command has a render-lifecycle bug. From [Menu Bar Commands](https://developers.raycast.com/api-reference/menu-bar-commands):

> If a menu bar command returns a `MenuBarExtra`, it must either not set `isLoading` … or set `isLoading` to `true` while performing an asynchronous task and then set it to `false` once the task is complete. Raycast will then load the command code, execute it, wait for `MenuBarExtra`'s `isLoading` prop to switch to `false`, and then unload the command.

`isLoading` transitioning to `false` is the commit signal. Two consequences for the current code:

- `/Users/messina/Developer/GitHub/chrismessina/gh-pr-tracker/src/unread-menu-bar.tsx:92` returns `null` when the list is empty and not loading. Raycast restores menu bar items *from its database rather than re-executing the command*, so a render that never commits leaves the prior badge in place.
- The `useEffect` + `usePromise` seeding path (`src/unread-menu-bar.tsx:69-83`) is asynchronous. On any launch that does **not** carry `launchContext.items`, first render happens before the cache read resolves — exactly the race the file's own comments describe.

There is no fixed documented timeout; it is "dynamically adjusted to the interval" (5m here), and background timeouts surface as errors as of Raycast 1.94.0.

### Recommended fix — use `Cache`, not `launchContext`

[`Cache`](https://developers.raycast.com/api-reference/cache) is the documented tool for this problem:

- CRUD methods that **update and retrieve data synchronously** (unlike `LocalStorage`, which is async and "not meant to store large amounts of data")
- **Shared between the commands of an extension by default**
- 10 MB default capacity
- `Cache.subscribe()` allows an already-open menu to update live

The menu-bar docs' own best-practice guidance is to "make generous use of the Cache API … in order to provide quick feedback."

Two Store extensions implement exactly this pattern:

- **`mute-microphone`** — the action command calls `await launchCommand({ name: "mute-menu-bar", type: LaunchType.Background })` with **no context**; the menu-bar command seeds state synchronously: `useState<boolean>(AudioInputLevelCache.curInputLevel === "0")`.
- **`app-updates/src/menu-bar.tsx`** — `useState<AppUpdate[]>(() => getStoredUpdatesSync())`, with `isLoading` initialized `true` only when the cache is empty and cleared in a `finally`.

Target shape:

1. View command writes the payload to `Cache`, then fires `launchCommand` as a **bare trigger** (no `items` in context).
2. Menu-bar command seeds `useState` synchronously from `Cache` in an initializer, so first render is already correct.
3. `isLoading` always settles to `false` (in a `finally`); never return `null` from a background render — return a `MenuBarExtra` seeded from cache.
4. Wrap `launchCommand` in try/catch that **surfaces** the failure rather than swallowing it.

This also retires an unbounded risk: `launchContext` must be JSON-serializable but has **no documented size limit**, and the current code ships an `items` array through it on every refresh. `Cache` at least has a stated budget.

### Reproduction notes

- **Uninstall the dev copy before testing.** Raycast 1.38.1 changelog: "Improved logic for deciding which version of a command gets launched when a user has both a production and a development version of an extension installed." A dev copy can service launches and mask the bug entirely.
- Toggle **Preferences → Advanced → "Use Node production environment"** — Store extensions run in Node production mode, dev extensions in development mode, and [console logging is automatically disabled for Store extensions](https://developers.raycast.com/basics/debug-an-extension).
- Check **Extension Diagnostics** to confirm the menu-bar command is registered for background refresh.

### Related historical bug

Raycast 1.45.0 (2022-12-14): "Fixed the `launchContext` not being propagated to menu-bar and background launches when using the `launchCommand` API." Long fixed, but it establishes that this path has been fragile.

### Not confirmed

No coalescing between an explicit `launchCommand` background launch and a scheduled `interval` launch is documented. The docs state only that commands are terminated to "prevent overlapping background launches of the same command." A dropped launch near a scheduled one is plausible but **unverified** — do not design around it.

---

## 2. Silent failure paths — CONFIRMED

The extension currently has no error visibility. Every one of these swallows failures without a trace:

| Location | Swallowed |
| --- | --- |
| `src/unread-updates.tsx:103` | `launchCommand` throw — **the suspected root cause of §1** |
| `src/unread-menu-bar.tsx:44` | `launchCommand` throw (openFocused) |
| `src/unread-menu-bar.tsx:54` | `launchCommand` throw (openAll) |
| `src/unread-menu-bar.tsx:79` | **All fetch errors** — handler body is a comment only |
| `src/cache.ts:12` | JSON parse failure → silently returns `null` |
| `src/seen.ts:14` | JSON parse failure → silently returns `{}` (**all seen state appears lost**) |
| `src/event-filters.ts:42` | JSON parse failure → silently resets to defaults |

`src/unread-menu-bar.tsx:79` is the most consequential: a background command has no toast UI, so a persistently failing fetch is indistinguishable from "all caught up."

### `@chrismessina/raycast-logger` — recommended

This is a web-request extension, which per house style calls for the logger. Specific justifications here:

- **It is the instrument that confirms §1.** The `launchCommand` throw is currently unobservable; logging it is how the hypothesis becomes a diagnosis.
- **Redaction is load-bearing.** The PAT rides in an `Authorization` header, and `fetchAllPages` interpolates the request URL into thrown error messages (`src/api.ts:64`). The logger auto-redacts tokens/keys; naive logging risks leaking the PAT into console output.
- A `verboseLogging` checkbox preference fits the existing preference set.

Caveat: Store extensions have console logging disabled by default, so logger output is a **development and production-environment-toggle** diagnostic, not a field-telemetry channel.

---

## 3. First-load performance

### Current cost model

`/Users/messina/Developer/GitHub/chrismessina/gh-pr-tracker/src/api.ts:141-184`:

- Pass 1: list open PRs per repo, paginated at 100/page (metadata only, then `slimPr`'d).
- Pass 2: for each PR, in batches of `CONCURRENCY = 5`, **five separate paginated REST calls**:
  `/pulls/{n}/reviews`, `/pulls/{n}/comments`, `/issues/{n}/comments`, `/issues/{n}/events`, `/pulls/{n}/commits`
- Continues until `maxUnread` (default 25) collected or `maxScan` (default 150) scanned.

At default settings that is **up to ~750 requests plus pagination** on first load, since nothing is marked seen yet. The `CONCURRENCY = 5` batching bounds memory, not latency.

### Headline result — MEASURED

A single GraphQL query returned **90 PRs across 3 repos with complete activity in 14 seconds for 14 rate-limit points**. The equivalent REST work is ~450 requests.

**~97% request reduction.** At 14 points against the 5000/hr GraphQL budget, that is ~350 full refreshes per hour.

Single-repo measurements against `raycast/extensions`:

| PRs per query | Time | Cost (points) | Nodes |
| --- | --- | --- | --- |
| 20 | 7.6s | 5 | 10,220 |
| 50 | 7.0s | 13 | 25,550 |

Cost scales with **PR count, not the 5x sub-resource fan-out** — the fan-out becomes free. The node limit is 500,000 and 50 PRs consumed 25,550, leaving ~20x headroom. The binding constraint is GitHub's **10-second query timeout**, so **30-50 PRs per query** is the safe operating point.

### Data fidelity — CONFIRMED via live schema introspection

Every field `types.ts` consumes exists in GraphQL. Verified against the live schema, not docs: `diffHunk`, `replyTo`, `line`, `originalLine`, `fullDatabaseId`, and `pullRequestReview` are all on `PullRequestReviewComment`; `LabeledEvent`, `UnlabeledEvent`, `HeadRefForcePushedEvent`, and `PullRequestCommit` are all in the `PullRequestTimelineItems` union. `diffHunk` was diffed against the REST response on a live PR — **identical**.

Two implementation requirements:

- **Use `fullDatabaseId`, not `databaseId`.** It returns a string, which keeps the existing `itemKey` scheme (`rc-456`, `review-123`) compatible with **already-stored seen-state**. Getting this wrong silently invalidates every user's read history.
- **Truncation is real and must be detected.** With `last: 10` sub-pages, 9 of 90 PRs had >10 commits and 8 of 90 had >10 review threads. Because only *unseen* activity is rendered this is usually harmless, but the query must request `totalCount` and fall back to REST for the rare deep PR.

### The `updated_at` pre-filter has a race condition — MEASURED

This was the highest-value correctness question. Tested empirically on a throwaway private repo across 8 event types:

| Event | Bumps `updated_at`? |
| --- | --- |
| Issue comment | **Yes**, promptly |
| Label added / removed | **Yes**, promptly |
| Commit push | **Yes**, promptly |
| Force push | **Yes**, promptly |
| Submitted review | **Yes**, promptly |
| **Standalone inline review comment** | **No — lags ~6-10s** |

Reproduced across 3 trials (1 of 3 failed to bump within 6s). The API was caught in a state where `maxReviewComment = 21:32:29` **exceeded** `pr.updated_at = 21:32:19` — a comment strictly newer than the PR's own timestamp.

This is **eventual consistency, not permanent loss**: it converged within ~10s and stayed converged over 60s. This behavior is not documented anywhere; it only surfaced through the experiment.

**Consequence:** a strict `updated_at > lastSeen` skip will intermittently drop a review comment posted seconds before a fetch — silently, and exactly the activity type this extension exists to surface. **Subtract a 60s safety margin** from the comparison timestamp and the optimization becomes safe.

### Corrections to assumptions in the brief

1. **GraphQL does not support ETags.** Response headers were checked directly — no `etag`, no `last-modified`. Conditional caching and GraphQL are **mutually exclusive per endpoint**. This is the main tradeoff against recommendation #1.
2. **304 responses are genuinely free** — verified, not assumed. Three consecutive conditional requests held `x-ratelimit-used` at 335; one unconditional 200 moved it to 336.

### Ranked recommendations

| # | Change | Impact | Tradeoff |
| --- | --- | --- | --- |
| 1 | **Replace the 5-call fan-out with one batched GraphQL query** | ~97% fewer requests; first load from minutes to seconds | Full rewrite of `fetchActivity`; forfeits ETag caching; needs truncation fallback |
| 2 | **ETag-cache the PR *list*** (REST, per repo) | Polling with no changes becomes nearly free | None significant — composes with #1, since the list stays REST |
| 3 | **`updated_at` pre-filter with 60s safety margin** | Skips sub-resource fetches for untouched PRs | **Only correct with the margin** (see race above) |
| 4 | `GET /notifications` for change detection | Cheap | Wrong as a primary source: watched repos only, and its read/unread semantics collide with this extension's own seen-state |
| 5 | Search API (`GET /search/issues`) | — | **Skip.** 30 req/min and a 1,000-result cap make it strictly worse than the PR list |

Recommendations 1, 2, and 3 compose: GraphQL for activity, ETag'd REST for the list, and the margin-adjusted pre-filter to skip PRs entirely.

### Working query

Validated against the live API (`rateLimit` block included for cost measurement). This is the multi-repo form that produced the 90-PR/14s/14-point result:

```graphql
fragment PRA on PullRequest {
  number title url createdAt updatedAt state
  author { login avatarUrl }
  comments(last: 10) { totalCount nodes { fullDatabaseId body createdAt updatedAt url author { login avatarUrl } } }
  reviews(last: 10) { totalCount nodes { fullDatabaseId state body submittedAt url author { login avatarUrl } } }
  reviewThreads(last: 10) { totalCount nodes { comments(last: 10) { nodes { fullDatabaseId body path line originalLine diffHunk createdAt updatedAt url author { login avatarUrl } replyTo { fullDatabaseId } pullRequestReview { fullDatabaseId } } } } }
  commits(last: 10) { totalCount nodes { commit { oid message committedDate url author { name date user { login avatarUrl } } } } }
  timelineItems(last: 20, itemTypes: [LABELED_EVENT, UNLABELED_EVENT, HEAD_REF_FORCE_PUSHED_EVENT]) {
    nodes { __typename
      ... on LabeledEvent { id createdAt actor { login avatarUrl } label { name color } }
      ... on UnlabeledEvent { id createdAt actor { login avatarUrl } label { name color } }
      ... on HeadRefForcePushedEvent { id createdAt actor { login avatarUrl } } }
  }
}
query Multi {
  rateLimit { cost nodeCount remaining }
  r0: repository(owner: "raycast", name: "extensions") { pullRequests(states: OPEN, first: 30, orderBy: {field: UPDATED_AT, direction: DESC}) { nodes { ...PRA } } }
  r1: repository(owner: "facebook", name: "react") { pullRequests(states: OPEN, first: 30, orderBy: {field: UPDATED_AT, direction: DESC}) { nodes { ...PRA } } }
  r2: repository(owner: "microsoft", name: "vscode") { pullRequests(states: OPEN, first: 30, orderBy: {field: UPDATED_AT, direction: DESC}) { nodes { ...PRA } } }
}
```

Repos are aliased (`r0`, `r1`, …) so all configured repos batch into one request. Note `totalCount` on every connection — that is the truncation detector.

### Architectural consequence

GraphQL returns activity **already scoped per PR**, which collapses the two-pass scan in `src/api.ts` into a single query. The `maxScan` preference becomes largely vestigial: its purpose was bounding the per-PR fan-out, and that fan-out disappears. `maxUnread` remains meaningful as a display cap.

The comment at `src/api.ts:128-140` documenting the memory-bound rationale will need rewriting — the OOM pressure it guards against is a REST-shaped problem.

---

## 4. Reuse from the official Raycast GitHub extension

Evaluated [`raycast/extensions/extensions/github`](https://github.com/raycast/extensions/tree/main/extensions/github) (MIT, © 2021 Raycast, author `thomaslombart`) for reusable work. **One clear adopt, three rejections.**

| | Verdict | Cost | Blocker |
| --- | --- | --- | --- |
| **(a) GraphQL codegen pipeline** | **Adopt** | ~half a day | None |
| **(b) Copy their PR GraphQL fragments** | **No — write our own** | N/A | They fetch counts, not content |
| **(c) Switch to OAuth** | **No — keep the PAT** | N/A | **GitHub Enterprise** |
| **(d) Their menu-bar pattern** | **No — ours is more capable** | N/A | They don't attempt the feature |

### (a) Codegen — ADOPT

They use `@graphql-codegen` with a live-introspected schema. Replication needs: devDeps `@graphql-codegen/cli`, `/typescript`, `/typescript-operations`, `/typescript-graphql-request`, `graphql`, `dotenv`, `concurrently`, `@parcel/watcher`; dep `graphql-request`; a `codegen.ts`; `.env` with `GITHUB_TOKEN` (gitignored, `.env.example` committed); `generate` + watch-mode `dev` scripts; and **`ignores: ["*.graphql", "**/generated/**"]` in the eslint config** or `ray lint` chokes on the generated file.

Codegen is build-time only — nothing ships to users.

Two deviations from their setup worth making:

- **Set `onlyOperationTypes: true`.** Their committed `src/generated/graphql.ts` is **1.75 MB** — the entire GitHub schema materialized as TypeScript. That flag drops unreferenced types and should cut it by 90%+. Types erase at compile time so runtime impact is ~zero, but repo and Store-review weight are real.
- Keep the trailing `#` in their `afterAllFileWrite: ["ray lint --fix #"]` hook — it swallows the filename codegen appends and is load-bearing.

### (b) Their fragments — DO NOT COPY

Their `PullRequestFields` fragment requests sub-resources **only for counting** — `comments(first: 0) { totalCount }`. `first: 0` is the tell. They sum totals into a badge.

Coverage against what `types.ts` consumes:

| Needed | In official extension |
| --- | --- |
| review `body` / `submitted_at` / `html_url` | Only `bodyText`; details fragment has `state` + author only |
| review comment `diffHunk` | **Absent — zero occurrences extension-wide** |
| review comment `replyTo` / `line` / `originalLine` / `path` | **Absent** |
| issue comment stable IDs | Only `author.login` + `body` — unusable for seen-tracking |
| label added/removed **events** | **Absent** (they fetch current labels, never events) |
| force-push events | **Absent — no `timelineItems` query anywhere** |
| commit sha/message/author | **Present** (`PullRequestCommitFields`) |

One of eight. They also never handle truncation — single page, no cursors, no `pageInfo`.

**Worth lifting verbatim:** `AuthorFields` from `src/api/user.graphql`, which handles `Bot` / `Mannequin` / `Organization` / `EnterpriseUserAccount` via inline fragments. **`GHUser` will break on bot authors without this** — directly relevant, since bots comment on PRs constantly.

Also worth copying as a *convention*: `totalCount` alongside `nodes` on every connection (the truncation detector already recommended in §3).

**The query we need does not exist in their codebase.** A `timelineItems`-based query is the single node yielding labels, force-pushes, reviews, and comments as one ordered stream — and it's the core of the rewrite. We write it ourselves.

### (c) OAuth — REJECT, Enterprise blocker

They use `OAuthService.github` with PAT fallback via `withAccessToken`. **The GraphQL endpoint is a hardcoded string literal (`https://api.github.com/graphql`), and `OAuthService.github()` is Raycast's own github.com OAuth app.** There is no documented GHES path — zero references to configurable endpoints anywhere in the extension.

Adopting OAuth would **silently break the `ghHost` preference**, a feature the official extension does not have. Keep the `token` password preference.

One cheap detail worth stealing regardless: their header-scheme branch, `type === "personal" ? \`token ${token}\` : \`bearer ${token}\`` — the thing people get wrong when mixing PAT and OAuth.

### (d) Menu bar — REJECT the pattern, take two components

**They do not share data between menu-bar and view commands at all.** No `Cache`, no `LocalStorage` handoff, no `launchCommand` with context; `launchCommand` is navigation-only. Each command independently re-fetches from the network. They avoid the §1 bug by not attempting the feature.

So the current `source: "view-refresh"` context push is *more* capable than theirs. But two things are worth taking:

- **`useCachedPromise` instead of `usePromise` + manual `useEffect` seeding.** It returns cached data on the **first render**, synchronously — which is precisely the async gap documented at `src/unread-menu-bar.tsx:61-65` and identified in §1 as the render-lifecycle defect. This is a plausible partial fix for the Store staleness and composes with the `Cache` approach. Note: they're on `@raycast/utils@^1.16.0`, this repo is on `^2.2.7` — **verify `useCachedPromise` semantics didn't shift across the major**.
- **`MenuBarRoot`'s clickable-error affordance** (`src/components/Menu.tsx`): on error it renders an `Error: …` item whose `onAction` relaunches the command. The current `onError` (`src/unread-menu-bar.tsx:79`) swallows silently and waits 5 minutes — a badge that is stale with no recovery path. Their `MenuBarSection` `maxChildren` + `moreElement` also generalizes the hardcoded `slice(0, 5)` + "Show all".

### Other applicable patterns

- **Optimistic updates** via `mutate(promise, { optimisticUpdate })` — directly applicable to the mark-as-seen actions, cleaner than the current reload-after-write in `seen.ts`.
- **Cache shape guard.** Their code carries a defensive comment about a GitHub outage returning null PRs and corrupting the cache. `loadCachedPRs()` only try/catches `JSON.parse` — structurally valid but null-populated data passes through. Worth a shape check.

### Licensing

MIT at both the repo root (© 2021 Raycast) and the extension's `package.json`. This repo is already MIT, so no compatibility issue. Copying is permitted; MIT requires the notice be retained for "substantial portions."

Practical: config scaffolding (`codegen.ts`, eslint ignore, npm scripts) is boilerplate from graphql-codegen's own docs and carries no attribution burden. If `AuthorFields` is lifted verbatim or `Menu.tsx` adapted wholesale, add `// Adapted from raycast/extensions extensions/github (MIT, © 2021 Raycast)`.

### Nothing is installable

None of it is published to npm — `src/api`, `src/helpers`, `src/generated` are in-repo with relative imports. **Copying patterns is the only route.** The genuinely reusable dependencies are all public third-party: `@graphql-codegen/*`, `graphql-request`, `@octokit/rest`.

### Where it does not help

Per-item seen state, timeline event ingestion (labels, force-pushes), review-comment diff context, Enterprise hosting, and menu-bar/view state coherence — every one of this extension's differentiators. The official extension solves a different problem (search-driven PR triage on github.com) with a much shallower data model. **It has no per-item unread tracking of any kind**; `unread-notifications.tsx` is a thin wrapper over GitHub's server-side Notifications API, which is thread-level, subscription-only, and has no counterpart to `SeenMap` / `seenItemIds`.

That absence is also *why* (b) and (d) come back negative: their data model never needs stable per-item IDs, which is exactly what our GraphQL rewrite must guarantee.

---

## 4.5 FIELD MEASUREMENT (2026-07-27) — §3's cost model was wrong

Instrumented run against a real repo, cold cache, fresh install. **This supersedes §3's ~750-request estimate.**

```
[API] Listed open PRs        { repos: 1, openPrs: 311, maxUnread: 25, maxScan: 150 }
[API] PR activity fetch complete { scanned: 25, collected: 25, minRequests: 126,
                                   elapsedMs: 2412, hitScanCap: false }
```

**126 requests in ~2.4s — not ~750.**

### Why the estimate was wrong

§3 assumed a cold cache means scanning deep. It does not. The scan loop exits as soon as `collected` reaches `maxUnread`, so on a repo where the most recently updated PRs all have unread activity, **the first 25 scanned are the first 25 collected** and `hitScanCap` is `false`.

The ~750-request figure describes the **opposite** state: a well-read repo where the scan must chew through ~150 PRs to find 25 with unread activity. That is the steady state after daily use — so the worst case is real, but it is the *warm* case, not the cold one. Cold-start is cheap; it is sustained use that degrades.

### The measured numbers are preference-dependent, not fixed

`maxUnread` and `maxScan` are **user-editable preferences** (1–1000). The 126-request measurement reflects the *default* `maxUnread: 25`, not a property of the extension. Since `minRequests ≈ scanned × 5`:

| `Max Unread PRs` | Scanned (activity-rich repo) | Requests | Est. elapsed |
| --- | --- | --- | --- |
| 25 (default) | 25 | ~126 | ~2.4s (measured) |
| 100 | 100 | ~501 | ~10s |
| 150+ | 150 (`maxScan` cap) | ~751 | ~14s |

`maxScan` bounds the worst case at 150 PRs regardless of `maxUnread` — that is the preference's purpose.

**Two independent paths reach the expensive regime:** raising `maxUnread`, or reaching steady state (most PRs read, so the scan must dig toward `maxScan` to find unread ones). §3's original ~750 figure was right about the ceiling and wrong about when it is reached.

**Consequence for §3's ranking:** at the default `maxUnread: 25`, the GraphQL rewrite saves ~1.5–2s — not "minutes to seconds." But GraphQL cost scales with **PR count, not the 5× fan-out** (§3: 90 PRs / 14s / 14 points), so the saving grows with the preference: ~2s at 25, but ~10s→~2s at 100.

**The rewrite's value is proportional to how far this preference is raised and how well-read the repos are.** Re-measure in the steady state before committing to its scope.

### Duplicate concurrent fetches — every log line appeared twice

Every entry paired with distinct timings (2412ms *and* 2565ms), confirming two genuine concurrent fetches rather than double-logging. Not React StrictMode: `@raycast/api` does not wrap commands in it.

**ROOT CAUSE (confirmed by instrumentation, then FIXED):** an initial diagnosis blamed the view/menu-bar split. That was **wrong** — `source` tagging showed the pairs were *same-source* (two `view`, then two `menu-bar`), not one of each.

A module-scoped `MODULE_LOAD_ID` settled it:

```
Module loaded  { moduleLoadId: 'vkhn5g' }   ← ONE module load
Fetch starting { moduleLoadId: 'vkhn5g' }
Fetch starting { moduleLoadId: 'vkhn5g' }   ← SAME id
```

One process, one module load, `usePromise` running twice. Not React StrictMode (`@raycast/api` does not use it — an apparent `StrictMode` hit in its bundle is TypeScript *compiler* internals, `isEffectiveStrictModeSourceFile`, not React).

**Second wrong hypothesis (recorded so it is not retried):** that `usePromise` received an **inline arrow function** whose changing identity restarted the fetch. Hoisting into `useCallback` **did not fix it**. The installed `usePromise` stores `fn` in a **latest-value ref** and revalidates on deep-memoized `args` / `execute` — **not on function identity** (`node_modules/@raycast/utils/dist/module.js:96`, effect at `:267`). The theory was unfalsifiable against the actual implementation.

**ACTUAL ROOT CAUSE — Raycast's dev renderer runs effects twice (DEV-ONLY).**

Raycast's runtime creates its React root with `isStrictMode: true` whenever `NODE_ENV` is neither `production` nor `test`:

```
/Applications/Raycast.app/Contents/Resources/RaycastNodeExtensions_RaycastNodeExtensions.bundle/
  Contents/Resources/api/node_modules/@raycast/api/index.js:16
```

The bundled reconciler maps that to strict mode and **explicitly disconnects and replays passive effects in development** (`react-reconciler.development.js:11876`, `:10291`, `:9912`).

Note this lives in the **Raycast.app bundle**, not the project's `node_modules` — which is why an earlier `grep` for `StrictMode` in `node_modules/@raycast/api` came back empty and was wrongly read as "Raycast does not use StrictMode."

One module instance → two development effect setups → two concurrent non-abortable fetches. The mount `setState`s are **not causal**.

**DEV-ONLY: production roots receive `isStrictMode: false`.** No shipped build ever double-fetched, so an earlier claim that this had been "doubling every fetch for every user since 1.1.0" was **wrong** — it was a `ray develop` artifact, and the ~1,004-request figure never applied to users.

To confirm: enable **"Use Node production environment"** or install the dist build, then launch each command in isolation — expect exactly one `PR activity fetch complete` per launch.

**Fix applied:** a same-microtask request coalescer sharing the strict-effects replay's in-flight promise (`unread-updates.tsx:43`, `unread-menu-bar.tsx:15`). It clears on the next microtask, so ⌘R and interval refreshes still start a fresh scan. The `useCallback` hoists were retained (harmless, marginally correct) but their misleading comments were corrected.

**Still outstanding — the cross-command duplication is real but separate.** The view and menu-bar commands each run their own `fetchPRsWithActivity`; `fetchAndCompute()` does a full scan whenever the menu bar launches without context items (5-minute interval, or opened directly). The `view-refresh` push only suppresses it when the **view** initiates. Fix belongs in the §1 `Cache` refactor: a shared key with a freshness check lets the menu bar consume the view's result. That takes 2 fetches → 1.

---

## 5. Adversarial review (Codex) — corrections to §3 and §4

An independent Codex pass was run specifically to refute §4's verdicts. It corrected several. **Where this section contradicts §3 or §4, this section wins.**

### 5.1 BLOCKER — `fullDatabaseId` does NOT preserve all seen-state keys

§3 claims using `fullDatabaseId` keeps existing `itemKey`s compatible. **This is false for two of six item types.**

Existing keys (`src/utils.ts`):

| Key format | GraphQL parity |
| --- | --- |
| `review-${id}` | ✅ `fullDatabaseId` |
| `rc-${id}` | ✅ `fullDatabaseId` |
| `ic-${id}` | ✅ `fullDatabaseId` |
| `commit-${sha}` | ✅ `oid` |
| `label-added-${id}` / `label-removed-${id}` | ❌ **No database ID** |
| `force-push-${id}` | ❌ **No database ID** |

`LabeledEvent`, `UnlabeledEvent`, and `HeadRefForcePushedEvent` expose only an **opaque GraphQL `id`**, which GitHub documents as not decodable or human-readable. The current keys use REST issue-event IDs, which have no GraphQL counterpart.

**Consequence: on upgrade, every user's label and force-push events silently reappear as unread.** A partial, silent reset of read history in an extension whose sole purpose is tracking read state.

**This reorders the plan.** The key-compatibility contract must be locked *before* codegen or the Cache refactor, not after — both would otherwise be built on a false assumption. Required order:

1. Lock the GraphQL→legacy key contract; decide explicitly how label/force-push keys are derived.
2. Add a migration for event types without REST-ID parity.
3. Ship with the REST path retained as fallback.
4. Only then cut over.

**DECIDED (2026-07-27): synthetic stable keys, no migration shim.**

Label and force-push `itemKey`s move to a synthetic form derived from stable content rather than an API-assigned ID:

```
label-added-${actor}-${createdAt}-${labelName}
force-push-${actor}-${createdAt}
```

These are reproducible from **both** the REST and GraphQL shapes, so the GraphQL cutover is a no-op for seen-state.

**Rationale for skipping migration:** the extension has ~12 downloads. Preserving existing label/force-push read state would mean either a permanent second code path (a REST call per PR purely for event IDs, forfeiting much of the perf win) or staged key-migration code carried indefinitely. Neither is worth it at this install base. Early users see a one-time resurfacing of label and force-push events as unread; this goes in the CHANGELOG.

The staged rollout the four-step order below implies (ship synthetic keys on REST first, then cut over) is therefore **unnecessary** — the key change and the GraphQL rewrite can land together.

**Residual risk:** synthetic keys collide if the same actor applies the same label to the same PR at an identical `createdAt`. Rare, and the failure mode is benign (one event treated as already-seen). Accepted.

### 5.2 REFUTED — the bot-author claim in §4(b)

§4 claims `GHUser` breaks on Bot/Mannequin authors and that `AuthorFields` is therefore needed. **Not true.** REST bot users supply `login` and `avatar_url` normally.

The real defect is **nullability, not polymorphism**:

- `src/utils.ts:71` assumes `e.actor` exists
- `src/types.ts:62` declares `actor` non-null when deleted/null actors are possible
- Commit authors are *already* handled correctly (`src/utils.ts:110`, `c.author ?? { login: c.commit.author.name, avatar_url: "" }`)

In GraphQL, `author` and `actor` are nullable `Actor` values. The fix is an adapter normalizing to a display-safe fallback — **not** Bot/Mannequin inline fragments for a REST problem that does not exist. Lifting `AuthorFields` verbatim would be cargo-culting.

### 5.3 QUALIFIED — `useCachedPromise` reads its own cache, not ours

§4(d) and §1 propose `useCachedPromise` as a partial fix for the Store-build staleness. It **does** synchronously return a cached value on first render (via `useCachedState` / synchronous `Cache.get`) — confirmed for v2.x.

**But its cache is namespaced by function hash and is separate from this repo's `LocalStorage` cache.** It cannot synchronously observe a fresh write from the view command. It only helps if **both commands read and write the same explicit Raycast `Cache` key** — which is the §1 recommendation. `useCachedPromise` complements that fix; it does not substitute for it.

### 5.4 QUALIFIED — `onlyOperationTypes` overstated in §4(a)

`onlyOperationTypes: true` is a valid `@graphql-codegen/typescript` option, best paired with `preResolveTypes: true`. But the docs describe it as emitting "basically only enums and scalars" — **not** "drop all unreferenced types." The **90%+ reduction claim in §4 is unverified extrapolation.** Measure the actual output before treating file size as a solved problem. The adopt-codegen verdict stands; the rationale was overstated.

### 5.5 The proposed GraphQL query is incomplete

§3's query has truncation gaps it claims not to have:

- **`timelineItems` lacks `totalCount` and `pageInfo`** — §3 asserts `totalCount` on every connection; not true here.
- **`reviewThreads.totalCount` without nested comment pagination still silently truncates** threads with >10 comments.
- §3 describes `timelineItems` as a single ordered stream for labels/force-pushes/reviews/comments, but the query still uses **separate connections** for most categories. The framing oversells what the query does.

`timelineItems` is not inherently a trap, but it needs a per-connection truncation policy and cursor fallback before it is production-ready.

### 5.6 Missing infrastructure (not in §3 or §4)

The GraphQL rewrite needs error handling the current code lacks entirely:

- GitHub GraphQL caps at **500,000 nodes**, may terminate queries at **10s**, and can return **partial data alongside an `errors` array** under resource limits.
- **`graphql-request` throws by default when `errors` is present** — partial data is only reachable via the raw-request / error-policy path. A naive port silently converts partial success into total failure.
- `src/api.ts:55` has pagination but **no retry, no backoff, no rate-limit classification, no request dedup, no `AbortSignal`**.
- No test infrastructure exists (`package.json` has no test script).

### 5.7 Enterprise support is broader than the OAuth question

§4(c) correctly rejects OAuth on Enterprise grounds, but the GraphQL rewrite has its **own** Enterprise obligations:

- Host-derived endpoint: `https://api.github.com/graphql` vs `https://${ghHost}/api/graphql`.
- **Confirm target GHES versions support `fullDatabaseId`, `reviewThreads`, and the timeline event variants used** — or declare a minimum version and retain a REST fallback.

### 5.8 Overstated framing in §4(d)

"They don't attempt the feature" / "ours is more capable" is too strong. Upstream ships **three independent, substantially richer menu-bar commands**. The accurate claim is narrower: upstream provides no view→menu shared-data handoff, so its pattern does not solve the §1 bug. Take its error/relaunch affordance and configurable section sizing; keep the shared-cache architecture.

### 5.9 MEASURED — `raycast-logger` does not redact credentials inside URLs

Probed `@chrismessina/raycast-logger@1.2.4`'s `redactString` and `sanitizeArgs` directly against real PAT shapes (2026-07-27):

| Input shape | Redacted? |
| --- | --- |
| Bare `ghp_…` in a message | ✅ → `ghp_***` |
| `token ghp_…` (Authorization header value) | ✅ → `token ghp_***` |
| `{ token: "ghp_…" }` structured field | ✅ → `"***"` |
| `?access_token=ghp_…` **in a URL** | ❌ **passed through intact** |
| `https://user:ghp_…@host` **userinfo** | ❌ **passed through intact** |

The last two leak through `sanitizeArgs` as well, so a structured `{ url }` field is not protected.

**Nothing leaks today** — this extension sends its PAT in an `Authorization` header and never in a URL. But `fetchAllPages` interpolates request URLs into thrown errors, so a future move to query-param auth would start leaking silently.

Mitigation shipped: `safeUrl()` in `/Users/messina/Developer/GitHub/chrismessina/gh-pr-tracker/src/logger.ts` structurally scrubs userinfo and the `access_token` / `token` / `client_secret` query params, falling back to `redactString` on unparseable input. All request URLs pass through it before logging. Verified against both leak shapes plus normal github.com and GHES URLs (unchanged).

**This is a finding about the logger package itself, not this extension** — it likely affects other extensions in the fleet that log URLs. Worth fixing upstream in `raycast-logger` rather than re-implementing `safeUrl` per extension.

### 5.10 Unverified

Codex hit fetch failures on some upstream raw URLs. §4(b)'s **"zero occurrences extension-wide"** absence claims (e.g. `diffHunk`) are therefore **neither confirmed nor refuted** — treat as unverified. The broader verdict (their fragments fetch counts, not activity payloads) held up.

### 5.11 Codegen operation types leave GraphQL custom scalars as `unknown`

The generated `PRActivity` surface is self-contained, but it has no scalar mappings: `fullDatabaseId`, `createdAt`, `url`, `oid`, and `committedDate` all emit as `unknown`. That blocks a type-safe adapter to the existing REST-shaped model, whose IDs and timestamps are strings/numbers. Before the GraphQL migration, add and test explicit output mappings for every selected custom scalar against real API JSON rather than spreading casts through the adapter.

### 5.12 The outer PR connection cannot meet the existing scan contract

`PRActivity` takes an unbounded `$first` but asks for neither `pageInfo` nor a cursor. GitHub limits each `first`/`last` connection page to 100, while this extension's current default `maxScan` is 150 and the preference permits 1000. Passing the existing cap straight through will fail above 100; clamping it will silently stop early. The GraphQL rewrite needs cursor pagination of the outer PR connection (and a deliberate policy for every truncated nested connection).

### 5.13 Nested review-thread comments are fetched oldest-first

Every other activity connection uses `last`, but `reviewThreads.nodes.comments` uses `first: 20`. On a thread with more than 20 comments that selects the oldest page, not the newest unread activity. `totalCount` detects that truncation, but the eventual adapter must either request the last page or take the documented fallback before using these nodes for seen-state.

### 5.14 Live-only introspection is a reproducibility dependency

The config has no checked-in introspection snapshot or offline fallback. On 2026-07-27, `npm run generate` loaded `.env` but failed before generation with `getaddrinfo ENOTFOUND api.github.com`; the existing generated file was unchanged. This is not a token leak, but it means a GitHub/DNS outage blocks schema regeneration and makes CI dependent on both network access and a token. Decide whether that availability tradeoff is acceptable or commit a reviewed schema snapshot for fallback.

### 5.15 The new storage guards validate only the outer shape

`loadCachedPRs()` accepts a PR with `reviews: [null]`, then `getAllActivity()` throws when dereferencing `r.state`. Likewise, `loadSeen()` accepts an arbitrary nested `seenItemIds` value; a non-iterable object reaches `new Set(seen.seenItemIds)` and throws. Guard each nested collection/state shape used downstream, or reject the whole cached record/map entry.

### 5.16 The committed setup template is currently absent from Git

`.env.example` is untracked in the current tree despite the setup documentation describing it as committed. Unless it is included in the eventual commit, fresh contributors have no safe token-file template. `.env` itself is correctly ignored and currently mode 0600, but ignore rules protect only untracked files; they are not an absolute prevention against a deliberate forced add.

### 5.17 Generated runtime code imports an undeclared production package

`src/generated/graphql.ts` imports `gql` from `graphql-tag`, but `package.json` declares `graphql-tag` only transitively through the codegen dev plugins, not in `dependencies`. It resolves in the current full development install, but the future runtime GraphQL path must either add `graphql-tag` as a direct runtime dependency or change generation/client transport to emit a dependency-free query string. Do not rely on dev-dependency hoisting for the Store bundle.

### 5.18 The deliberately omitted base plugin is still installed directly

`package.json` retains `@graphql-codegen/typescript` in `devDependencies`, although `codegen.ts` does not configure that plugin and the operation plugin does not require this direct declaration. It does not ship to users, but removing it would make the intended plugin contract unambiguous and reduce the development dependency closure.

### Revised sequencing

Now that §5.1 is decided (synthetic keys, no migration), the blocker is resolved and the original order holds:

1. **Logger** — instruments §1's suspected `launchCommand` throw; the diagnostic that turns that hypothesis into a diagnosis
2. **Codegen setup** (§4a) — measure the generated file size rather than assuming §4's 90% claim
3. **`Cache` refactor** (§1) — shared explicit `Cache` key read by both commands (§5.3); fixes the Store-build badge staleness
4. **GraphQL rewrite** (§3) — synthetic keys (§5.1), null-safe actor adapter (§5.2), truncation policy (§5.5), error handling (§5.6), host-derived endpoint (§5.7)

Each step is independently shippable. Steps 1–3 do not depend on the GraphQL work.

---

## 6. AS SHIPPED (1.2.0) — what the implementation actually became

Sections 1–5 are the investigation. This section records what landed, because several of the plans above were **superseded by measurement** during implementation. Where §§1–5 and this section disagree, **this section is what the code does**.

### 6.1 The GraphQL transport is two-pass, not one batched query

§3's "one request for 25 PRs" shape was implemented, measured, and **replaced**. The problem it could not solve: to decide whether a PR has unread activity, it downloaded that PR's full activity — reviews, diff hunks, comments, commits, timeline. On a repo where the user is caught up, that meant ~3,600 activity records fetched to surface 5 results.

The shipped design (`src/api-graphql.ts`):

1. **Metadata pass** — `number` + `updatedAt` only, `first: 100`, cursor-paginated. Measured: **200 PRs in 1,002ms for 2 rate-limit points.**
2. **Detail pass** — the full activity fragment **by PR number**, only for PRs that may contain unread activity, 6 concurrent. Measured: ~574ms / 1 point each.

Projected 150-PR scan with 5 needing detail: **~2.4s / 7 points**, against ~26.7s / 84 points for the page-based shape.

### 6.2 MEASURED — page size, and why `first: 50` was reverted

Against `raycast/extensions` (312 open PRs), 3 trials each:

| `first:` | elapsed | cost | result |
| --- | --- | --- | --- |
| 10 | 2,120ms | 6 | 3/3 succeeded |
| 25 | 4,738ms | 14 | 3/3 succeeded |
| 50 | 9,361ms | 28 | **2/3 — one 502 Bad Gateway** |

**Cost per PR is flat (~0.56 points) at every size**, so a larger page buys no quota saving and only makes each request heavier until GitHub's documented **10-second query timeout** rejects it. The 502 is that timeout, not a published complexity limit.

### 6.3 MEASURED — concurrency is free in quota terms

8 PRs via the by-number query, identical cost (8 points) at every level:

| concurrency | elapsed |
| --- | --- |
| 2 | 2,464ms |
| 4 | 1,286ms |
| 6 (shipped) | — |
| 8 | 892ms |

At concurrency 2 a **first run** — nothing marked seen, so every scanned PR needs detail — was **slower than the design it replaced** (~44s vs ~28s at 150 PRs), crossing over around 95 PRs. At 6 the new path wins at every point, worst case ~15.4s.

### 6.4 MEASURED — `timelineItems.totalCount` ignores `itemTypes`

The single most misleading GitHub API behavior found here. On `raycast/extensions#29797`:

```
filtered   timelineItems(last:30, itemTypes:[...]) → totalCount 9, nodes 4
unfiltered timelineItems(last:30)                  → totalCount 9
```

`totalCount` counts the **entire timeline** (commits, reviews, assignments) while `nodes` returns only the requested types. Comparing them flagged **every PR as truncated** — 25 of 25 — which triggered a REST backfill for all of them and defeated the optimization entirely.

Truncation for `timelineItems` is therefore detected by **saturation** (`fetched >= requested`), not by `totalCount`. Verified across 50 PRs: the other four connections (`comments`, `reviews`, `reviewThreads`, `commits`) report `totalCount` accurately, so their checks remain count-based.

### 6.5 The `fullySeenAt` watermark, and its honest limits

§5.1's decision was synthetic keys; the prefilter needed something further. `lastSeen` was **rejected** — marking a single item advances it while other activity stays unread, so trusting it would lose activity. A separate `fullySeenAt` watermark is set only by whole-PR actions (`markPRSeen` / `markAllSeen`) and by the fetch itself when it proves a PR has nothing unseen.

**The margin applies to only one kind of watermark.** A watermark backfilled from `pr.updated_at` sits on GitHub's clock — the same clock it is compared against — so `updatedAt === fullySeenAt` on an unchanged PR and subtracting 60s made the comparison trivially true, meaning the skip never fired for exactly the population the backfill targets. Those now use a zero margin. Watermarks written at `Date.now()` by the mark-as-read actions keep the 60s, because a standalone inline review comment can precede `updatedAt` by 6–10s (§3). `SeenState.watermarkSource` records which; entries predating the field are read as wall-clock, the conservative choice. (Reported by MiguelOlsen in Store review.)

**Honest limit, measured in the field:** a PR the user has never opened *has* unread activity by definition, so it cannot earn a watermark without lying about read state. Only PRs genuinely read — or with no activity at all — are skipped. In a first field test this recorded **5 watermarks out of 150 scanned**, matching the 5 PRs the user had actually marked. **Watermarks accumulate through normal use; cost drops gradually, not in one step.** Do not expect `skippedByWatermark` to jump immediately.

### 6.6 Blockers found by adversarial review (all fixed)

Two would have caused silent data loss:

- **Menu-bar read-modify-write race.** `fetchAndCompute` loaded seen-state, fetched for ~15s, then wrote back the *stale* snapshot — erasing any mark-as-read performed meanwhile, including its `fullySeenAt`. The view command had always reloaded post-fetch; the menu bar had not. Reloading before save narrows this to the window between reload and write; it is **not fully atomic**, because `LocalStorage` offers no compare-and-swap. Two writes landing within that window can still lose one.
- **`activeKeysComplete` could authorize destructive pruning.** Pages are cursor-paginated over a **mutable** `UPDATED_AT` ordering. An earlier fix looked for duplicate keys, but a duplicate only catches a PR sliding *backwards*; one that moves *ahead* of the saved cursor is skipped and leaves no trace at all. Completeness is therefore claimed only when every repo finished in a **single page**, where no cursor was followed and no reordering window existed. Multi-page scans never authorize pruning.
- **Pruning ignored repository scope.** Removing a repo from preferences deleted its entire read history on the next refresh. Pruning is now scoped to repos the scan actually covered.

Also fixed: truncation keyed on bare PR number (two repos can both have a `#42`); IDs beyond 2^53 now rejected rather than silently colliding; partial GraphQL responses (data + `errors`) now fall back to REST instead of being cached as truth.

### 6.7 What shipped disabled, and why

`useGraphQL` defaults **off**, with automatic REST fallback on any error. The transport is correct and measured, but the prefilter only pays off as watermarks accumulate (§6.5), and the Store-build menu-bar fix (§1) remains verifiable only by a real Store install. Both argue for earning trust through opt-in use before becoming the default.

### 6.8 Still open

- **`Max PRs to Scan` (default 150) is an emergency brake being used as the normal operating point** — `hitScanCap: true` fires on every refresh when the user is caught up, because the scan can never satisfy `maxUnread` and always runs to the cap. On `raycast/extensions`, 150 PRs ≈ one week of activity; ~43 ≈ 24 hours. A *time horizon* would be a more honest unit than a count, since the same number means wildly different coverage on different repos. Left unchanged: altering a default changes behavior for existing users.
- **Nested connections still page without cursors.** Truncation is detected and handled via REST backfill, not resolved via pagination.
- The 60s margin is **empirical, not a GitHub contract**. A longer propagation delay defers detection to a later refresh; it does not permanently mark anything read.

---

## Sources

- [Menu Bar Commands](https://developers.raycast.com/api-reference/menu-bar-commands)
- [Background Refresh](https://developers.raycast.com/information/lifecycle/background-refresh)
- [Command / launchCommand](https://developers.raycast.com/api-reference/command)
- [Cache](https://developers.raycast.com/api-reference/cache)
- [Debug an Extension](https://developers.raycast.com/basics/debug-an-extension)
- [Raycast Changelog](https://developers.raycast.com/misc/changelog)
- [raycast/extensions#4181](https://github.com/raycast/extensions/issues/4181)
