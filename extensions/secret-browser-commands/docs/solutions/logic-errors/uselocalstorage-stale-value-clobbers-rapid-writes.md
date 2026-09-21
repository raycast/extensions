---
title: useLocalStorage's returned value is stale after a write, so rapid toggles lose data
date: 2026-09-14
category: logic-errors
module: listCommands
problem_type: logic_error
component: frontend
symptoms:
  - Two stars pressed in quick succession persist only the second; the first is silently lost
  - Star/Unstar appears to do nothing at all on the press after a successful write
  - The losing write is the earlier one, so the star that vanishes is the first of the pair
root_cause: async_timing
resolution_type: code_fix
severity: high
framework_version: node 22.23.2
related_components:
  - data_model
tags:
  - raycast
  - react
  - use-local-storage
  - stale-state
  - optimistic-update
  - data-loss
  - useref
---

# useLocalStorage's returned value is stale after a write, so rapid toggles lose data

## Problem

`src/listCommands.tsx` persists the user's starred command IDs with
`useLocalStorage<string[]>("starred-commands", …)` from `@raycast/utils`. Starring two commands in
quick succession silently lost the first one.

`setValue` is async and does **not** update the hook's returned `value` synchronously — `value`
only changes after the write lands and the hook re-reads storage. The published signature is the
whole contract:

```ts
export function useLocalStorage<T>(key: string, initialValue?: T): {
    value: Awaited<T> | undefined;
    setValue: (value: T) => Promise<void>;
    removeValue: () => Promise<void>;
    isLoading: boolean;
};
```

Two consequences fall straight out of it. Any handler that computes its next value from `value`
computes it from the *pre-write* array if it fires again before the re-read lands. And there is no
error field — a failed read is indistinguishable from "nothing stored yet", because both surface as
the initial value with `isLoading` flipping false.

This is not specific to this extension: `raycast/extensions#17532` is an open upstream report of the
same hook's value lagging the store after a navigation pop.

## Symptoms

- Star command A, then immediately star command B. B is starred; A is not. No toast, no error, no log.
- After the first (failed) fix, a second defect: one Star/Unstar press worked and the *next* did
  nothing at all — no visual change, no error.

## What Didn't Work

Holding the latest value in a ref:

```ts
const latestStarred = useRef(starred);
latestStarred.current = starred;   // <-- runs on EVERY render
const toggleStar = (id) => {
  const cur = latestStarred.current;
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  latestStarred.current = next;
  setStarredCommands(next);
};
```

This was reported as fixed and was still broken. The assignment executes during *every* render, so a
render between two toggles resets `latestStarred.current` back to the hook's not-yet-updated array —
discarding exactly the optimistic value the ref existed to protect. In this component a single
keystroke in the search field is enough to cause that render. The ref narrows the race window; it
does not close it.

A second defect shipped alongside it: the hydration guard was written `if (isStarredLoading) return;`.
`isStarredLoading` goes true again during the storage re-read that follows *every* write, so after
any star the next press hit the guard and silently returned. A flag covering both initial load and
post-write revalidation cannot gate user input.

## Solution

The optimistic value lives in React state, which a render cannot clobber:

```ts
const hydratedStars = useMemo(
  () => (Array.isArray(starredCommands) ? starredCommands.filter((id) => typeof id === "string") : []),
  [starredCommands],
);
const [pendingStars, setPendingStars] = useState<string[] | undefined>(undefined);
const starred = pendingStars ?? hydratedStars;

const toggleStar = (commandId: string) => {
  // Only block before the FIRST hydration — not on the re-read after each write.
  if (isStarredLoading && pendingStars === undefined) return;
  const next = starred.includes(commandId) ? starred.filter((id) => id !== commandId) : [...starred, commandId];
  setPendingStars(next);
  setStarredCommands(next);
};
```

Three pieces, each doing one job:

- `hydratedStars` validates what came out of storage. Anything under that key was written by this
  code as `string[]`, but a corrupt or hand-edited value would take the whole list down on
  `.includes`, so it is filtered rather than trusted.
- `pendingStars` holds this session's writes. `starred = pendingStars ?? hydratedStars` means
  storage is authoritative until the first local write, then local wins — correctly, because after
  the first write this component *is* the most recent writer.
- The guard blocks only before the first hydration. Before the initial read lands the hook hands
  back the default value, so writing then would overwrite whatever was actually saved.

Confirmed with a throwaway harness that modelled the hook's write/re-read timing and interleaved a
render between two toggles. Against that model the ref version wrote the second toggle's array alone
— losing the first star — while the state version wrote the union. The harness modelled the hook
rather than driving the real component, and was not kept; treat it as a reproduction of the
mechanism, not as a regression test. An independent read-only probe during adversarial review
reproduced both defects the same way.

Shipped in `raycast/extensions#31118` (open at the time of writing).

## Why This Works

A ref assigned in the render body is not storage — it is a variable recomputed on every render, with
the same lifetime guarantee as a local `const`. `latestStarred.current = starred` says "this ref
always mirrors `starred`", which is precisely what makes it useless for holding a value that must
*differ* from `starred`. It appeared to work only because the render usually did not land between
the two toggles.

React state survives re-renders by definition. Because `pendingStars` is state, the second
`toggleStar` reads the array the first produced, regardless of how many renders happened in between
or where the hook is in its read/write cycle. The async round-trip stops being a correctness
dependency and becomes what it should be: durability only.

The guard change is the same idea applied to `isLoading`. The hook uses one boolean for two states —
"never read yet" and "re-reading after a write" — and only the first is a reason to refuse input.

## Prevention

**1. An optimistic value must live somewhere a render cannot reset it — React state, not a ref
assigned during render.** The tell is an assignment to `.current` in a render body of a component
that also mutates that ref from a handler. When both exist the render body wins whenever a render
lands between two handler calls, and the bug is timing-dependent and will not reproduce on demand.

```ts
// WRONG — the render body overwrites the handler's value
const ref = useRef(valueFromAsyncHook);
ref.current = valueFromAsyncHook;

// RIGHT — the handler's value outlives the render
const [pending, setPending] = useState<T | undefined>(undefined);
const effective = pending ?? valueFromAsyncHook;
```

A ref is acceptable only if it is never reassigned during render — initialized once and mutated
exclusively from handlers. State is the safer default and costs nothing here.

**2. A loading flag that also covers post-write revalidation must not gate user actions.** Gate on
"have we hydrated yet", not on "is the hook busy":

```ts
if (isLoading) return;                            // WRONG — true again after every write
if (isLoading && pending === undefined) return;   // RIGHT — blocks only before first hydration
```

Any `useLocalStorage` / `useCachedPromise`-shaped hook with a single `isLoading` boolean has this
property. Before writing `if (isLoading) return` in an event handler, ask whether that flag can go
true again later; if it can, the handler will silently no-op and the user gets no feedback.

**3. Test the interleaving, not the sequence.** Both defects survive a naive "toggle twice" check.
The reproduction that caught them forces a render *between* the two toggles — the only shape that
exposes a render-body assignment. No committed test covers this today, which is a real gap: the
guarantee currently rests on the code being written correctly rather than on anything that would
fail if it regressed.

**4. Neither defect is reachable by a static gate.** Both passed `tsc --noEmit`, `ray build` and
`ray lint`. `@raycast/eslint-config` ships no `react-hooks` rules, so an impure render body is not
flagged; adding `eslint-plugin-react-hooks` with `rules-of-hooks: error` is the durable guard.

**Known limitation, held rather than fixed:** `useLocalStorage` exposes no error field, so a failed
read is indistinguishable from an empty store. If a read genuinely fails, this component presents
the defaults as if they were the user's data, and the first toggle persists them over whatever was
saved. The `pendingStars === undefined` guard prevents writing *during* the load, but nothing can
distinguish a failed load from an empty one at the hook's API surface. Reading `LocalStorage.getItem`
directly is the only way to observe that failure.
