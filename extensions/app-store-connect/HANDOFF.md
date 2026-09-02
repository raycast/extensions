# Handoff — App Store Connect extension

Written 2026-08-27. Local-only: excluded via `.git/info/exclude`, so it is never committed
and never reaches a Store PR. Delete it when tranche 2 ships.

---

## 🚨 Do NOT run `npm run publish` until PR #30530 merges

`ray publish` pushes to **one fork branch per extension** — `chrismessina:ext/app-store-connect` —
not one per PR. That is the exact branch backing the open, **ready-for-review** PR #30530.

Publishing from `feature/tranche-2` would **overwrite the contents of that PR** with tranche 2's
work, silently, while a Raycast maintainer is reviewing it.

Verified 2026-08-27:

```
$ gh api repos/raycast/extensions/pulls/30530 --jq '.head.label'
chrismessina:ext/app-store-connect

$ git ls-remote https://github.com/chrismessina/extensions.git 'refs/heads/ext/*'
… refs/heads/ext/app-store-connect      ← one branch per extension, reused every publish
```

Build and commit freely on `feature/tranche-2`. Just don't publish.

---

## Where things stand

**PR #30530** — https://github.com/raycast/extensions/pull/30530

- `draft: false`, ready for review, awaiting maintainer approval
- `mergeable_state: blocked` — normal for `raycast/extensions`; not a failure
- All 10 checks pass, including **Greptile 5/5** and the extension build
- 47 files, base `raycast/extensions:main`, correctly scoped to `extensions/app-store-connect/`

**Branches**

| Branch | Contains |
| --- | --- |
| `main` | pre-session state (`ce07153`) |
| `feature/individual-api-keys-and-modernization` | tranche 1, three commits, ends at `00d2385` |
| `feature/tranche-2` | **current**; branched from `00d2385` because tranche 1 is not merged |

When tranche 1 merges upstream, rebase `feature/tranche-2` onto the merged state rather than
carrying tranche 1's commits into tranche 2's eventual PR.

### Post-merge cleanup for tranche 1 (do when it merges)

1. Raycast CI stamps `{PR_MERGE_DATE}` in the **merged monorepo copy** only. Read the merge date
   from `https://raw.githubusercontent.com/raycast/extensions/main/extensions/app-store-connect/CHANGELOG.md`
   and copy it onto the matching entry in
   `/Users/messina/Developer/GitHub/chrismessina/raycast-app-store-connect/CHANGELOG.md`.
   Touch **only** that entry.
2. Delete the merged `feature/individual-api-keys-and-modernization` branch.
3. No mirror-sync step: this is a fork of `johanthorell`'s extension, and no
   `chrismessina/raycast-app-store-connect` repo exists.

---

## Gates — all must be green before any commit

```bash
cd /Users/messina/Developer/GitHub/chrismessina/raycast-app-store-connect
npx tsc --noEmit      # ray build does NOT typecheck; this is the real gate
npm run lint
npm run build
npm test              # node --test over src/Utils/*.test.ts
```

`npm test` is a real gate, not decoration — verified by appending a failing assertion and
confirming exit 1.

`CLAUDE.md` and this file are in `.git/info/exclude`. That matters: `ray publish` refuses to
run with an untracked file present, and anything tracked in the extension root **ships**.

---

## Tranche 2 scope — decisions already made

### 1. `asc` CLI as an *optional accelerator* — not a rewrite

Rebuilding the extension on the `asc` CLI was considered and **rejected**. It is a 48 MB Go
binary at `/opt/homebrew/bin/asc`, not on Raycast's PATH, so every Store user without it gets a
broken extension — an install cliff with no in-extension remedy, and likely a review objection.
You would also still need Zod (still parsing untyped JSON, now drifting with `asc` versions
instead of Apple's API) and would lose incremental pagination to a subprocess.

Where it *does* earn its place:

- Surfaces expensive to build against the raw API — screenshot upload, metadata sync,
  notarization, signing.
- **Credential reuse.** `asc auth status --output json` lists configured profiles without
  exposing secrets. Adopting existing `asc` logins would get private keys out of `LocalStorage`
  entirely and close the concurrency limitation documented in
  `/Users/messina/Developer/GitHub/chrismessina/raycast-app-store-connect/src/Model/useTeams.tsx`.
  Chris already has one profile configured (`Tincan`, keychain-backed).

JWT parity note: `asc` signs individual keys the same way this extension does — empty issuer ID
selects `Subject = "user"` (`internal/asc/client_http.go`, `GenerateJWT`).

### 2. Two new commands — the highest-value gaps

**Customer Reviews** (`customerReviews`, `customerReviewResponses`) and **Tester Feedback**
(`betaFeedbackScreenshotSubmissions`, `betaFeedbackCrashSubmissions`). Both are read-heavy,
glanceable, daily, and have no good native surface. Both want the redesign below settled first.

### 3. App Status redesign — **HTML state matrix before any native code**

Agreed shape:

- **Sections by status**, always on. Most ASC accounts hold fewer than ~10 apps, so the list
  fits on screen and hiding rows behind a filter costs more than it buys.
- **Dropdown → Status.** Default "All Apps"; picking one collapses to that section.
- **Action menu → Platform**, as multi-select show/hide toggles, mirroring `Hide macOS-only` /
  `Hide Windows-only` in the Store Updates extension. Multi-select is the tell — a dropdown is
  single-select and you will want "iOS + macOS but not tvOS".
- **Platform icons as row accessories**, mirroring the 🍎/🪟 badges in Store Updates.

Why platform is *not* the dropdown: an app can hold iOS **and** macOS versions in different
states at once, and `selectVersionForPlatform` in
`/Users/messina/Developer/GitHub/chrismessina/raycast-app-store-connect/src/appStatus.tsx`
already picks *one* version per app from the platform filter. Platform changes **which row you
are looking at**, not which rows exist — a mode, not a subset.

The pattern generalises to Reviews and Feedback, so settle it once, on a clickable state matrix
(sections × status × platform toggles × empty), not in native code.

---

## Architecture a fresh session needs

### The paged-result box — do not "simplify" it away

`/Users/messina/Developer/GitHub/chrismessina/raycast-app-store-connect/src/Utils/pagedResult.ts`

`useCachedPromise` pagination always accumulates an **array**, but `mapResponse` may return a
collection *or* a single object. A single result is boxed with a marker **on the value itself**.

The marker cannot be a React ref: **cached data is restored synchronously on first render,
before the fetcher runs**, so anything set inside the fetcher is still unset when that data is
first read. An earlier ref-based version shipped and crashed with
`(t ?? []).map is not a function` — only on the *second* launch, which is why every gate was
green. Regression pinned in `src/Utils/pagedResult.test.ts`, including the JSON round-trip
(`JSON.stringify` drops `undefined` values).

Only a collection may paginate — a boxed single sets `hasMore: false` — otherwise pages
accumulate as `[box, ...items]`, which unboxes to neither.

### `loadAll` and truncation

`MAX_AUTO_PAGES = 50` in
`/Users/messina/Developer/GitHub/chrismessina/raycast-app-store-connect/src/Hooks/useAppStoreConnect.tsx`.
The path is tracked in a ref updated **during render**, not a `useEffect` — a separate reset
effect runs *after* the load effect has already seen the new path beside the previous path's
`pagination`, and would fire `onLoadMore` on a stale cursor. Hitting the ceiling sets
`isTruncated`, which App Status surfaces as "(showing first N)". Do not make it silent again.

### Credential identity

`/Users/messina/Developer/GitHub/chrismessina/raycast-app-store-connect/src/Utils/credentials.ts`

**Key ID is not unique.** The same key is legitimately stored twice when re-added under a
corrected Issuer ID. Identity is the **whole record**; removal drops exactly one entry. Deleting
by Key ID destroyed a working credential — that was Greptile's finding, reproduced by running
the old logic (it returned `[]` for a two-entry list).

`issuerID: ""` is normalized to `undefined` at the schema **and** in `getCurrentTeam`, because
every other path treats `""` as absent while a raw `""` compares unequal to `undefined`.

Credentials live in **two places**: a `teams` array *and* four flat `LocalStorage` keys holding
the selection. `LocalStorage` has no compare-and-swap, so concurrent writes are last-write-wins.
Documented on the hook, not fixed — closing it means one serialized record with a stable id,
i.e. a storage-format migration. That migration is the natural companion to the `asc`
credential-reuse work above.

### Individual API keys

Team key signs `iss: <issuerId>`; individual key signs `sub: "user"` and omits `iss`. Header
identical. Absence of `issuerID` is what selects the path — see `getBearerToken`.

---

## Open / unverified

- **An individual API key has never been exercised end-to-end.** The claim structure is verified
  against Apple's docs, the `asc` Go source, and a live signing check with a throwaway P-256 key,
  but no real individual key has been through the extension.
- **`@chrismessina/raycast-logger` cannot be installed here.** Its peer range is
  `@raycast/api: ^1.0.0`, and no published version (through 1.3.0) allows 2.x — `npm install`
  hard-fails with `ERESOLVE`. This blocks the logger on **every** extension migrating to Raycast
  2.0, not just this one. Needs a 1.3.1 with `^1.0.0 || ^2.0.0`.
- **`@raycast/eslint-config` 1.x → 2.x** would clear 6 high advisories (`minimatch` ReDoS,
  dev-only, not shipped). It is a major that ships flat config — a `develop` migration gated by
  `dep-gates.md`, deliberately not done during a submission run.
- **App icons in list rows** need eyes on a real account. `useAppIcons` batches 25 apps per
  request; if *no* app shows an icon the relationship linkage is wrong and it should read from
  `included` instead.

---

## Working agreements that bit during tranche 1

- **Run the codex gate before saying done.** It found the Critical in `AddTeam` (a render-time
  `currentTeam` meant a rejected key deleted the *working* one) and, on the fix for Greptile's
  finding, five more in the same seam — including `SignIn` rolling back the wrong credential.
- **Point reviewers at seams, never scope by severity.** Both useful reviews this session came
  from prompts naming the joins (writer ↔ reader, cache ↔ source of truth) and asking for
  *everything*.
- **Check what already exists before writing it.** `getPlatformLabel` sat three files away in
  `src/Utils/statusHelpers.ts` and its logic got duplicated anyway, three times.
