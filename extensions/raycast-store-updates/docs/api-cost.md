# API cost model

Why this extension is careful with GitHub API requests, and what the optional token buys.

## The budget

The extension works with **no token** — install it and it runs. That default path is
GitHub's unauthenticated tier: **60 requests/hour, per IP**, shared across every command
and every background refresh. An optional `githubToken` preference raises it to
**5,000/hour**. Tokenless is the priority path; the token is an accelerator.

Only `api.github.com` counts. `raw.githubusercontent.com` is separate infrastructure and
is not billed — measured 2026-07-28: two raw fetches moved `core.used` by 0. That
asymmetry is the lever the whole design pulls on.

## Where requests go

| Source | Billed? |
| --- | --- |
| The merged-PR list (one request per scan) | **yes** |
| `/pulls/{n}/files` slug fallback | **yes** — one per unresolved PR |
| `package.json` metadata (`raw.*`) | no |
| Changelog bodies (`raw.*`) | no |

`/pulls/{n}/files` is the dangerous one: it is per-PR, so an uncapped fallback scales with
the PR list. Measured worst case before the cap: **29 billed requests in a single scan** —
two scans exhausted the tokenless hourly budget and the extension locked itself out.

Two controls keep it bounded:

1. **Resolve slugs from data already fetched.** `parseExtensionSlugFromPR` reads the
   `extension:` label, `head.ref` (`ext/<slug>`), and title patterns off the PR list
   response. Against a live 50-PR window this resolved **35 of 35** merged PRs with no
   extra request.
2. **A hard per-scan cap** (`createFilesBudget`): 5 billed `/files` requests tokenless,
   50 with a token. A PR that exceeds the cap keeps its title-derived slug. Every
   `/files` caller — including the removal path — draws on the same allowance.

**Slug corroboration.** A candidate slug is only *adopted* when the `extension:` label
asserts it. "`extensions/<slug>/package.json` exists" proves the extension exists, not
that it belongs to this PR — a branch named `ext/foo` on a PR touching something else
would otherwise adopt foo's Store URL and changelog.

## The optional GraphQL transport

`useGraphQL` (off by default) routes the PR list through GitHub's GraphQL API. It
**requires a token** — GraphQL has no unauthenticated tier — and falls back to REST
without one, or on any error. Both commands share one entry point, `fetchMergedPRs()`,
which picks exactly one transport.

> The view command originally used `useFetch` with the GraphQL attempt inside
> `parseResponse`. That was wrong: `useFetch` issues the REST request *before* calling
> `parseResponse`, so an opted-in user paid for both. It now uses `useCachedPromise` so
> the hook owns the request. Verified: token + opt-in → `graphql: 1 | REST: 0`.

What GraphQL buys, measured 2026-07-28:

- **1 point** of the 5,000/hr GraphQL budget for 50 PRs.
- `states: MERGED` filters server-side, so every returned PR is usable — **125 items vs
  118** on REST, which returns closed-or-merged and discards the rest client-side.

It is *not* primarily a request-count win: the REST path already costs one request for the
list. It matters most for the menu bar, which refreshes hourly in the background.

## ETag conditional requests — free only when authenticated

Measured against the same endpoint on both paths (2026-07-28):

| | HTTP | `x-ratelimit-used` across consecutive 304s |
| --- | --- | --- |
| Authenticated (limit 5000) | 304 | 31 → 31 → 31 — free |
| **Unauthenticated (limit 60)** | 304 | 9 → 10 → 11 → 12 → 13 — **billed like a 200** |

The endpoint serves a `W/"…"` ETag and returns a correct 304 either way; only the billing
differs. Unauthenticated, a conditional request saves bandwidth, not quota — so ETag
caching is not a fix for the tokenless path.

This corrects `gh-pr-tracker`'s `PERFORMANCE-FINDINGS.md` §3 ("304 responses are genuinely
free"), which is true for that extension — it holds a PAT — and not portable here.

## Rate-limit handling

A genuine rate limit **always** reports `X-RateLimit-Remaining: 0`. A bare 403 without it
is a proxy/VPN/network rejection, and treating it as a rate limit locks the user out of
quota they still have. Without a usable `X-RateLimit-Reset`, the cooldown falls back to
the ordinary 5-minute refresh interval rather than a fabricated hour.
