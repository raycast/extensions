---
title: "A rejected API key surfaced as a bare HTTP 401 and cascaded across the command"
date: 2026-08-27
category: integration-issues
module: karakeep-raycast-extension
problem_type: integration_issue
component: authentication
symptoms:
  - "`Error: HTTP 401` with nothing naming the API key or offering a way to fix it"
  - 'Opening Search Bookmarks reports "Couldn''t load lists" — an error from a request made only for its filter dropdown'
  - Every view reports the operation that failed rather than the credential that caused it
  - Stale rows from the previous run keep rendering as current, because a permanent auth failure is treated as transient
  - '"Try Again" never recovers, even after the key is corrected in Extension Settings'
root_cause: logic_error
resolution_type: code_fix
severity: high
framework_version: "@raycast/api 2.1.0"
related_components:
  - api_layer
  - frontend
tags:
  - raycast
  - api-key
  - http-401
  - error-handling
  - request-cascade
  - preferences
---

# A rejected API key surfaced as a bare HTTP 401 and cascaded across the command

## Problem

A wrong or revoked Karakeep API key surfaced only as `Error: HTTP 401`, with nothing naming the API key or offering a way to fix it. Worse, a single bad key produced a *cascade*: opening one command fired several independent data hooks that each failed and toasted separately, so the user saw an error about lists on a command they opened to see bookmarks.

## Symptoms

- `Error: HTTP 401` in the logs and a toast that names the operation but never the cause
- List views report "Couldn't load bookmarks"; create/edit forms report "Couldn't create bookmark"
- Opening Search Bookmarks reports **"Couldn't load lists"** — from a request the command only makes to populate its filter dropdown
- Stale rows from the previous run keep rendering as if current, because a permanent auth failure is treated like a transient one
- "Try Again" on the error screen never recovers, even after the key is corrected in Extension Settings

## What Didn't Work

- **Parsing the error body for a message.** Karakeep answers a rejected key with the plain-text body `Unauthorized`, and the parser only handled JSON shapes, so every path fell through to a bare `HTTP ${status}` line. Verified by curl against a live instance: `401` + `Unauthorized`; a genuinely nonexistent route returns `404`, so a 401 is unambiguously auth and not a missing endpoint.
- **Relying on the existing reachability probe.** `isApiReachable` fetched an endpoint *without* the auth header and counted **any** HTTP response as reachable — correct for "can I attempt a write", useless here. A 401 read as "server is up", every gate opened, and each view then fired its own doomed request.
- **Gating each hook on the probe.** This fixes the views that *have* a gate and misses every one that does not. After gating the visible filter dropdown, the cascade persisted: the command root did its own ungated `useGetAllLists()` for a different consumer, and `BookmarkEdit` fetches tags the same way. Gating call sites does not scale — it depends on remembering, including for hooks added later.
- **Adding a "Try Again" action.** It cannot succeed. See *Raycast snapshots preferences per command run* below.
- **Redacting credentials only in the non-JSON fallback.** The JSON branches `return` earlier, so a proxy answering `401 {"message":"Bearer ak1_…"}` still put the key in a toast and on the clipboard.

## Solution

Four parts. The first three are the architecture; the fourth is a platform constraint that shapes the UI.

### 1. Type the error so a 401 is distinguishable

`throw new Error("HTTP 401")` discards the one bit every caller needs.

```ts
// /Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/src/utils/apiError.ts:10
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.name = "ApiError"; this.status = status; }
}

// /Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/src/utils/apiError.ts:32 — 401 only, and structural rather than `instanceof`
export function isAuthError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as Partial<ApiError>).status === 401;
}
```

**401 only, deliberately.** Treating 403 the same way lets a per-resource permission failure blank an entire view and send the user to re-check a key that is fine.

### 2. Probe the credential before dependent fetches run

```ts
// /Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/src/utils/connection.ts:152
export async function probeApi(apiUrl: string, timeoutMs = 3_000): Promise<ApiProbeResult>
```

One request to the cheapest authenticated endpoint (`/api/v1/users/me`), returning `"ok" | "unauthorized" | "unreachable"` — or *no* request at all when the key is blank, which is classified `unauthorized` outright (`/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/src/utils/connection.ts:161`). It **fails open on anything that is not a 401**, so an older server answering 404 cannot lock a user out of an extension whose key is fine.

This was a one-line classification change in practice: every consumer already gated on `state === "reachable"`, so teaching the probe about 401 closed the cascade everywhere those gates existed.

### 3. Latch the rejected credential in the fetch layer

Because gating call sites misses the ungated ones:

```ts
// /Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/src/apis/index.ts:49 — before the request goes out
if (isRejectedKey(apiKey)) {
  throw new ApiError("HTTP 401 — Unauthorized", 401);
}
```

**Keyed on the credential string, not a boolean** (`/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/src/utils/apiError.ts:122`). That is what makes it self-healing: change the key and the next request no longer matches, so it goes out for real. A bare latch would keep refusing a key that had become correct.

**The latch needs an escape hatch, or it wedges.** Once latched, nothing routed through the fetch layer can reach the server, so nothing can produce the success that clears it — a key that starts working again (an interleaved 401 during a restart, a token re-provisioned server-side) stays locked out for the whole run. `probeApi` therefore *owns* the latch, marking on 401 and clearing on success; it does not go through the short-circuit, so it can always ask again.

### 4. Raycast snapshots preferences per command run

**This is the transferable finding.** `getPreferenceValues()` keeps returning the values the command *launched* with. A key corrected in Extension Settings is invisible until the command is relaunched — so a "Try Again" affordance on an auth-error screen can never succeed, however it is implemented.

Observed directly from a live session: after correcting the key, the retry still short-circuited on the latch with **no request leaving the machine** (no `[API] GET …` log line, and a two-frame stack with no `processTicksAndRejections`), proving `getApiConfig()` still returned the old key.

The recovery screen therefore opens Settings **and pops to root** (`/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/src/components/ConnectionErrorView.tsx:93-94`), so relaunching is the obvious next step rather than something the user has to work out. The split is by error **state**, not by view type: the same component’s unreachable-server branch also opens Settings without popping (`/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/src/components/ConnectionErrorView.tsx:228`), and the create/edit forms deliberately do not pop either, because that would discard typed input.

## Why This Works

The three layers answer three different failure modes, and none of them subsumes the others:

| Layer | Stops | Fails without it |
|---|---|---|
| Typed `ApiError` | a 401 looking like any other failure | every consumer shows a generic "couldn't load X" |
| `probeApi` | doomed requests firing at all | each gated view fires and toasts separately |
| Credential latch | the requests nobody gated | the cascade survives in ungated hooks and any added later |

The latch is what makes the fix robust to future edits: the codebase's recurring failure is *forgetting the guard*, so the stop lives in the one place every request already passes through.

## Prevention

- **Never throw away an HTTP status at the throw site.** A caller that cannot tell a permanent credential failure from a transient one cannot offer the right recovery. Carry the status on the error type.
- **A reachability probe that ignores credentials answers the wrong question.** "Is something listening" and "will my requests succeed" are different; a 401 proves the server is *up*, which is exactly why the naive probe passes.
- **Redact on every return path, not just the fallback.** Any error text that reaches a toast also reaches the clipboard via Copy Error. Route all branches through one redactor and test the branches individually — the leak here was in the JSON paths, which returned before the fallback's redaction (`/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/src/utils/apiError.ts:57`).
- **Don't trust `await revalidate()` to throw.** `@raycast/utils` routes a rejection through `handleError`, which normalizes the error and **returns** it (`/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/node_modules/@raycast/utils/dist/module.js:127` and `:158`), so the promise resolves with an `Error` instead of rejecting. A refresh action wrapped in a success/failure toast will report success over a request that 401'd. The type hides this too — the paginated variant declares `revalidate: () => void` (`/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/node_modules/@raycast/utils/dist/types.d.ts:119`) while the runtime returns the callback's promise (`/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/node_modules/@raycast/utils/dist/module.js:237`). Inspect the resolved value (`/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/src/utils/fetchError.ts:71`).
- **A wrapper that swallows failures into `undefined` cannot be used to gate a follow-up action** unless the wrapped action returns a sentinel — an action returning `void` resolves to `undefined` on success *and* failure, so "refresh only if it worked" silently always refreshes.
- **Verify library behavior against the shipped `.d.ts` and dist, not the docs.** Several claims here (the `revalidate` return, `getPreferenceValues`' default type parameter at `/Users/messina/Developer/GitHub/chrismessina/raycast-karakeep/node_modules/@raycast/api/types/index.d.ts:4809`) are contradicted by, or absent from, the published documentation.
- **The cascade shape is not unique to this extension.** A month earlier the same underlying shape — several Raycast hooks each independently firing the same or related request on one command open — was diagnosed in a different extension, `gh-pr-tracker`, as duplicate `Listed open PRs` calls on reload *(session history, 2026-07-28)*. Two independent instances make this a fleet-level pattern rather than a one-off, so prefer a stop in the shared request layer over per-hook gating in any extension where several hooks share one credential.

## Related Issues

- **No upstream issue documents the preference-snapshot lifetime.** Searches of `raycast/extensions` for the status code, for `getPreferenceValues` staleness, and of `raycast/utils` for preferences all returned nothing relevant, and `developers.raycast.com/migration/v2` 404s. The behavior here is recorded as **observed, with its reproduction**, because there is no ticket or doc to cite.
- See also `/Users/messina/Developer/dotfiles/claude/docs/solutions/workflow-issues/read-the-version-off-the-running-artifact-not-repo-master.md` — a different domain with the same shape: the running artifact's state is not the state you are reading from source.
- Shipped in `raycast/extensions` PR #30595, open and awaiting review as of this writing.
