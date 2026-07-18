# Design Decisions

This file records important product and engineering decisions so future contributors do not unknowingly reverse them.

## D001 — Use a real Raycast extension

**Status:** Accepted

TweetCraft is implemented as a TypeScript Raycast extension rather than a collection of shell script commands.

Reasons:

- better Raycast integration,
- preferences support,
- local storage support,
- richer history UI,
- shared code between commands,
- more predictable clipboard and HUD behavior.

## D002 — Configure proxy behavior explicitly

**Status:** Accepted

The user's Terminal may inherit proxy environment variables while Raycast does not.

Therefore Gemini networking must not depend solely on inherited shell environment variables.

Consequences:

- proxy settings should be explicit,
- no author-specific proxy should be enabled by default,
- setup diagnostics should distinguish proxy and network failures,
- diagnostics must redact proxy credentials,
- changes to the HTTP client must preserve proxy compatibility.

## D003 — Save the original text before calling Gemini

**Status:** Accepted

A failed network request must not cause the user's Chinese input to disappear.

The extension saves the original input locally before any Gemini call.

If local persistence itself fails:

- do not call Gemini,
- copy the original Chinese text,
- show an error.

This ordering is a core safety invariant.

## D004 — Do not use the clipboard as the primary draft store

**Status:** Accepted

An earlier option was to copy the Chinese text to the clipboard before every request.

It was rejected because it pollutes the clipboard and can overwrite content the user intended to keep.

Local history is the primary recovery mechanism. Clipboard fallback is used in the failure path to keep the user moving.

## D005 — Keep history local and bounded

**Status:** Accepted

History policy:

- maximum 50 records,
- 30-day automatic cleanup,
- five-minute deduplication for identical Chinese input,
- no API key storage,
- categorized errors,
- successful retry updates the existing record.

Reasons:

- protect privacy,
- avoid unbounded storage,
- keep the history useful,
- prevent repeated failures from creating noise.

## D006 — Update a record after retry instead of creating a duplicate

**Status:** Accepted

A retry is a continuation of the same user action.

When it succeeds, the original failed record should be updated with the English output and success state.

## D007 — Copy English on success and Chinese on failure

**Status:** Accepted

Success path:

- copy the generated English.

Failure path:

- copy the original Chinese.

This gives the user a predictable outcome after the Raycast command closes.

## D008 — Categorize operational errors

**Status:** Accepted

Current categories include:

- `timeout`
- `proxy`
- `network`
- `quota`
- `api_key`
- `model`
- `request`
- `unknown`

The category is intended for local recovery UX and diagnostics, not for storing sensitive raw responses.

## D009 — Treat prompts as product behavior

**Status:** Accepted

Prompt edits can materially change meaning, tone, and trustworthiness.

Prompt work should be evaluated with representative examples and should not add unsupported facts merely to produce more dramatic posts.

## D010 — GitHub is the project source of truth

**Status:** Accepted

Repository:

```text
taaneo/tweetcraft-raycast
```

Current release tag:

```text
v1.2.0
```

The repository is intended to be public and submitted to the Raycast Store. Future work should be committed and versioned through Git rather than distributed primarily as replacement ZIP folders.

## D011 — Store history as independent local records

**Status:** Accepted

The v1 history schema stored every record in one JSON array. Concurrent Raycast command instances could both read the same array and overwrite each other's changes.

The v2 schema stores one record per `LocalStorage` key and migrates valid v1 records on first read. This makes unrelated writes independent while keeping the command-facing history API small.

## D012 — Use US English for Store-facing UI

**Status:** Accepted

Raycast Store command metadata, HUD messages, actions, and history UI use US English. Chinese remains the expected source content, and a Chinese README is maintained for users who prefer it.
