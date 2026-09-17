---
title: An AbortSignal cannot tell self-cancellation from supersession
date: 2026-08-11
category: logic-errors
module: useFetchSite
problem_type: logic_error
component: service_object
symptoms:
  - A failed request left the loading spinner running forever and never showed an error
  - "A retry started during the failure toast switched OFF the newer request's spinner"
  - Every static gate stayed green while both bugs shipped
root_cause: async_timing
resolution_type: code_fix
severity: high
tags: [abortcontroller, react-hooks, race-condition, cancellation, raycast]
---

# An AbortSignal cannot tell self-cancellation from supersession

## Problem

A hook aborted its own `AbortController` to cancel pending auxiliary work after a
failure. That flips the same `signal.aborted` a *newer* request flips, so the
`catch` and `finally` — which read the signal to decide "is this request still
mine?" — treated a genuine failure as a user cancellation. A dead host produced no
error and a spinner that never stopped.

## Symptoms

- Dig an unreachable host: no error card, spinner spins indefinitely.
- Any other error: error card renders, spinner keeps spinning underneath it.
- `tsc --noEmit`, `ray build`, and `ray lint` all exit 0 throughout.

## What Didn't Work

**A `abortedByOwnFailure` boolean.** Set it immediately before each self-abort;
have the `catch` require `!abortedByOwnFailure` and the `finally` accept it. This
fixed the hang and passed a targeted harness 10/10.

It was still wrong, and an adversarial review caught it. The flag records *our own
history*; the question being asked is *who owns the view now*. Those diverge across
an `await`:

```
A fails -> flag = true -> setError -> await showFailureToast(...)
B starts (Retry), takes the ref, setIsLoading(true)
A's finally: flag is STILL true -> setIsLoading(false) -> B's spinner is switched off
```

Any state a request records about itself goes stale the moment another request can
start. The `await` in the failure path is what makes the window real.

## Solution

Ask the ref, not the signal and not a flag. The ref points at whichever request is
current, so identity against it answers the ownership question directly and cannot
go stale (`/Users/messina/Developer/GitHub/chrismessina/raycast-digger/src/hooks/useFetchSite.ts:366`):

```ts
const abortController = new AbortController();
abortControllerRef.current = abortController;          // :291

// "has a newer request taken over?" — cannot go stale
const ownsView = () => abortControllerRef.current === abortController;
```

```ts
} catch (err) {
  if (!ownsView()) { log.log("fetch:aborted", { targetUrl }); return; }   // :1185
  // ... classify, setError, await toast
} finally {
  if (ownsView()) setIsLoading(false);                                    // :1231
}
```

This subsumed the flag in both places, so the flag was deleted — the fix is
smaller than the bug it replaced.

Keep the signal for what it *is* good at. Two different questions need two
different predicates:

| Question | Predicate | Gates |
|---|---|---|
| Has anything cancelled this work? | `signal.aborted` | data writes, progress updates |
| Do I still own the UI? | `ref.current === mine` | error display, spinner |

## Why This Works

`AbortSignal.aborted` is a single boolean with two distinct causes — "someone
superseded me" and "I cancelled myself" — and it cannot distinguish them. The ref
is the actual source of truth for ownership: exactly one request is current, and
assignment is what makes it so.

The flag failed because it answers a question about the past ("did I abort
myself?") in a place that needs a question about the present ("am I current?").
Across an `await`, only the present-tense question stays correct.

## Prevention

- **In a hook holding a `ref` to the current operation, gate UI-owning writes on
  ref identity.** A boolean the operation sets about itself is stale by
  construction once a sibling can start.
- **Suspect every `await` in a failure path.** The regression lived entirely in the
  window opened by `await showFailureToast(...)`. Ask what a user could start
  during it.
- **Write the race into the harness, and check the fix is narrow, not permissive.**
  The decisive signal was that seven of eight assertions passed under *both* the
  old and new logic — only the race assertion changed:

  ```
  MODE=flag  "retry during toast -> B's spinner still running"  FAILED  7/8
  MODE=ref                                                              8/8
  ```

  A fix that turns more assertions green than the bug explains is loosening a
  condition, not fixing a cause.
- **Static gates cannot see this class at all.** Both bugs shipped with tsc, build,
  and lint green. A spinner that never stops is only visible to someone at the
  screen or to a harness that models the interleaving.
- **Point an independent review at the seams.** The flag regression was found by an
  adversarial reviewer asked to attack the *join* between the catch, the finally,
  and the awaited toast — not the units, each of which was locally correct.

## Related Issues

- Shipped in raycast/extensions#30127 (merged 2026-08-11).
