# Plan 006: Isolate asynchronous work by query generation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e6ac2e8..HEAD -- package.json package-lock.json vitest.config.ts src/features/search/useQueryEngine.ts src/core/query/queryReducer.ts src/core/query/queryReducer.test.ts`
> Plan 005 is expected to change the test/config files. Confirm it is DONE and
> its tests pass. If production query files changed or the action/state excerpts
> below no longer match, stop and request a refreshed plan.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/005-establish-query-test-baseline.md`
- **Category**: bug / architecture
- **Planned at**: commit `e6ac2e8`, 2026-07-18

## Why this matters

The current engine uses shared booleans and one mutable abort-controller ref to
represent query currency. A slow language detection from input A can finish
after input B starts because `queryText()` does not create a new controller
before detection and `shouldClearQueryRef` is reset globally. Separately, a
provider that completes after cancellation can dispatch `SET_RESULT` or
`FINISH_QUERY` into the state for the next query because reducer actions carry
only provider type. The visible effects can include old text replacing new
results and old completion actions stopping the new loading indicator.

Give every user query a monotonically increasing generation and make both the
hook and reducer reject work from older generations. Abort remains the resource
cancellation mechanism; generation identity becomes the correctness boundary.

## Current state

- `src/features/search/useQueryEngine.ts:105-108` stores one controller plus two shared
  booleans:

  ```ts
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const shouldClearQueryRef = useRef(false);
  const isCurrentQueryRef = useRef(true);
  const hasPlayedAudioRef = useRef(false);
  ```

- `src/features/search/useQueryEngine.ts:160-195` dispatches translation start, streamed
  results, final result, and finish without any query identity. The stream
  debouncer can dispatch later from its timer.
- `src/features/search/useQueryEngine.ts:206-217` does the same for dictionary providers.
- `src/features/search/useQueryEngine.ts:221-244` creates a controller only after language
  detection, inside `queryTextWithTextInfo()`:

  ```ts
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();
  dispatch({ type: "RESET_FOR_NEW_QUERY" });
  ```

- `src/features/search/useQueryEngine.ts:284-303` starts detection with whatever controller
  happens to exist and gates completion only on the shared clear flag:

  ```ts
  detectLanguage(text, abortControllerRef.current?.signal).then((detectedLanguage) => {
    if (shouldClearQueryRef.current) return;
    queryTextWithDetectedLanguage(text, toLanguage, detectedLanguage);
  });
  ```

  If input B resets `shouldClearQueryRef` to false, a late completion from input
  A passes this check.
- `src/core/query/queryReducer.ts:59-75` actions identify only provider type.
  `FINISH_QUERY` therefore cannot distinguish "Bing from generation 1" from
  "Bing from generation 2".
- `src/core/query/queryReducer.ts:153-160` resets pending state for a new query
  but stores no active generation.
- Base provider classes already normalize aborted operations to `CancelledError`,
  and `showErrorToast` ignores that error. Keep that behavior; provider
  subclasses must not add catches.

## Target design

Use one small session value throughout the hook:

```ts
interface QuerySession {
  generation: number;
  signal: AbortSignal;
}
```

The hook owns a monotonically increasing `generationRef`. Beginning either a
detected query or a direct `QueryWordInfo` query must:

1. increment the generation;
2. abort the previous controller;
3. create the new controller;
4. dispatch reset/clear with the new generation;
5. pass `{ generation, signal }` through every async path.

`QueryState` stores `activeGeneration`. Every async/session action carries a
`generation`; the reducer returns the existing state when that generation is
not active. `SET_TARGET_LANGUAGE` remains a synchronous UI action and does not
need a generation.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Add hook test support | `npm install --save-dev @testing-library/react jsdom react-dom@19.2.1 @types/react-dom@19` | exit 0; manifest/lock updated |
| Focused tests | `npm test -- src/core/query/queryReducer.test.ts src/features/search/useQueryEngine.test.ts` | exit 0 |
| Full tests | `npm test` | exit 0, all tests pass |
| Typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Lint/fix | `npm run fix-lint` | exit 0 |
| Build | `npm run build` | exit 0; extension builds successfully |

## Suggested executor toolkit

- Use the `raycast-extension` skill if available. Preserve Raycast-native state
  and lifecycle patterns; do not introduce an external state manager.

## Scope

**In scope** (the only files to modify or create):

- `src/features/search/useQueryEngine.ts`
- `src/features/search/useQueryEngine.test.ts` (create)
- `src/core/query/queryReducer.ts`
- `src/core/query/queryReducer.test.ts`
- `package.json`
- `package-lock.json`
- `vitest.config.ts` only if required for a jsdom test environment
- `plans/README.md` (status only)

**Out of scope** (do not touch):

- Provider subclasses, provider registries, response parsing, or provider base
  class contracts.
- `src/core/detect/index.ts` internals. This plan passes a correct per-query
  signal into detection but does not cancel losing detectors within one race.
- `src/hooks/useAutoPlayAudio.ts`; keep its current `isCurrentQueryRef` and
  controller inputs unless compilation proves a signature-only update is
  unavoidable. If logic changes would be required, STOP.
- Query result/domain type redesign, display formatting, and UI components.
- `.github/workflows/`, GitHub Actions, `SECURITY.md`, vulnerability-reporting
  instructions, and the embedded Caiyun credential location.

## Git workflow

- Branch: follow the operator's current branch unless told to create one; if a
  branch is required, use `codex/006-query-generations`.
- Recommended atomic commit:
  `fix(query): ignore stale asynchronous completions`.
- Do not push or open a pull request unless explicitly instructed.

## Steps

### Step 1: Add generation identity to the reducer

In `src/core/query/queryReducer.ts`:

1. Add `activeGeneration: number` to `QueryState`. Initial state in
   `useQueryEngine.ts` must initialize it to `0`.
2. Add `generation: number` to these actions:

   - `START_QUERY`
   - `FINISH_QUERY`
   - `SET_RESULT`
   - `SET_DETECTED_LANGUAGE`
   - `RESET_FOR_NEW_QUERY`
   - `CHECK_PENDING_QUERIES`
   - `CLEAR_ALL`

3. `RESET_FOR_NEW_QUERY` must always accept its generation, store it as
   `activeGeneration`, clear pending providers, set loading true, and preserve
   existing visible results.
4. `CLEAR_ALL` must always accept/store its new generation and clear results,
   pending state, detail, and loading.
5. Before handling every other generation-bearing action, return the existing
   state if `action.generation !== state.activeGeneration`. Keep
   `SET_TARGET_LANGUAGE` generation-free.
6. Do not encode the generation into `QueryResult`, `QueryWordInfo`, or provider
   response types. It is orchestration metadata, not provider/domain data.

Update the baseline reducer fixtures and add explicit regressions:

- a stale `SET_RESULT` cannot change results;
- a stale `FINISH_QUERY` cannot remove the active generation's pending provider
  or stop loading;
- a stale `SET_DETECTED_LANGUAGE` cannot change displayed languages;
- active-generation equivalents still work;
- reset and clear advance `activeGeneration` with their supplied value.

**Verify**: `npm test -- src/core/query/queryReducer.test.ts` → all old and new
reducer tests pass.

### Step 2: Centralize query-session creation in the hook

In `src/features/search/useQueryEngine.ts`:

1. Add a private `QuerySession` interface and `generationRef`, initialized to 0.
2. Add one `beginQuerySession()` callback that increments the generation,
   aborts the old controller, creates/stores a new controller, marks the query
   current for audio, resets `hasPlayedAudioRef`, and returns the generation and
   signal. It must not start providers itself.
3. Remove `shouldClearQueryRef`; generation plus abort replaces it.
4. Extract the provider fan-out currently inside `queryTextWithTextInfo()` into
   an internal function that accepts both `QueryWordInfo` and `QuerySession`.
   It dispatches `RESET_FOR_NEW_QUERY` once for that session, then starts all
   enabled provider calls with the same session.
5. Keep public behavior:

   - `queryText(text, toLanguage)` begins exactly one session before calling
     `detectLanguage`, passes its signal, and after resolution verifies both
     that the signal is not aborted and the generation is still current before
     setting detected language or starting providers.
   - public `queryTextWithTextInfo(queryWordInfo)` begins exactly one session and
     directly starts providers; it is used when the user changes target language.
   - detection completion must not begin a second session.

6. `clearQueryResult()` increments/invalidates the generation, aborts and clears
   the controller, marks audio not current, and dispatches `CLEAR_ALL` with the
   new generation. A late callback from any older session must therefore fail
   both the hook check and reducer check.

Keep session creation close to the hook; do not introduce a class, global store,
or generic request manager.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Thread the session through every asynchronous dispatch

Update private function signatures so `runTranslationQuery`,
`runDictionaryQuery`, `queryTextWithDetectedLanguage`, and
`createStreamDebouncer` receive the relevant session or generation explicitly.

Requirements:

- use `session.signal`, never reread `abortControllerRef.current?.signal` from
  inside an already-started provider call;
- attach `session.generation` to START, SET_RESULT, FINISH, detected-language,
  reset, and pending-check actions;
- the stream debouncer's delayed flush must dispatch with its originating
  generation;
- keep `debouncer.clear(false)` on error/cancellation so aborted partial text is
  not flushed;
- all provider `finally` blocks may still dispatch FINISH because the reducer
  now rejects stale generations;
- do not add catches inside provider subclasses and do not suppress real errors.

Search every `dispatch({` call in the hook and account for it. Only
`SET_TARGET_LANGUAGE` should remain generation-free.

**Verify**:

`rg -n 'type: "(START_QUERY|FINISH_QUERY|SET_RESULT|SET_DETECTED_LANGUAGE|RESET_FOR_NEW_QUERY|CHECK_PENDING_QUERIES|CLEAR_ALL)"' src/features/search/useQueryEngine.ts`

→ every match includes the originating `generation` in its action object.

### Step 4: Add hook-level race regressions

Install the test-only dependencies listed in "Commands you will need" and
create `src/features/search/useQueryEngine.test.ts`. Mark this file for the jsdom
environment with Vitest's per-file environment directive unless a narrowly
scoped config entry is clearer.

Use `renderHook` and `act` from `@testing-library/react`. Mock only external
boundaries:

- mock `@/core/detect` with controllable deferred promises;
- mock dictionary/translation registries with controllable arrays; use one fake
  provider whose calls and deferred completions can be inspected across cases;
- mock `@/consts` preferences and logger/toast side effects;
- mock `useAutoPlayAudio` so audio does not obscure query-state assertions.

Do not mock `queryReducer` or the generation logic.

Required cases:

1. Start detected query A, then B. Resolve B first with one language and A later
   with a different language. The hook must retain B's language, and the fake
   provider's request spy must show that no provider request was started for A.
2. Start direct provider query A, then B using a controllable fake dictionary
   provider that does not automatically reject when aborted. Resolve B, then A.
   Displayed sections must contain B's word only.
3. With the same setup, let A's `finally` execute after B has started but before
   B completes. `isLoading` must remain true until B finishes.
4. Start a query, call `clearQueryResult()`, then resolve the old deferred work.
   Results remain empty and loading remains false.

Each test must restore mocks/timers and must not make a network call.

**Verify**: `npm test -- src/features/search/useQueryEngine.test.ts` → all four race cases
pass and no unhandled rejection is reported.

### Step 5: Run the complete gate

Run in order:

1. `npm test`
2. `npx tsc --noEmit`
3. `npm run fix-lint`
4. `npm test` again if lint changed files
5. `npm run build`

Also run:

```bash
rg -n "shouldClearQueryRef" src
git diff --check
git status --short
```

**Verify**: all verification commands exit 0; the `rg` command returns no
matches; status contains only in-scope files.

## Test plan

- Preserve every plan 005 characterization test.
- Add reducer unit tests proving stale generations are no-ops for results,
  completion, and detected language.
- Add hook tests for out-of-order detection, out-of-order provider completion,
  stale FINISH/loading behavior, and clear-then-complete behavior.
- Use deferred promises/fake providers so scheduling is deterministic; do not
  use real timers or arbitrary sleeps.

## Done criteria

- [ ] `QueryState` exposes `activeGeneration`, initialized to 0.
- [ ] Every async query action carries a generation and stale generations are
      reducer no-ops.
- [ ] `queryText()` creates and owns a controller before language detection.
- [ ] Direct and detected queries each create exactly one session.
- [ ] Provider functions and stream timers use their captured session signal
      and generation, not the mutable controller ref.
- [ ] `shouldClearQueryRef` no longer exists.
- [ ] `npm test` exits 0 with all baseline and race tests passing.
- [ ] `npx tsc --noEmit`, `npm run fix-lint`, and `npm run build` exit 0.
- [ ] No frozen or out-of-scope file changed.
- [ ] Plan 006 is marked DONE in `plans/README.md`.

## STOP conditions

Stop and report rather than broadening scope if:

- Plan 005 is not complete or its baseline tests do not pass.
- Correctness appears to require changing a provider implementation or response
  shape rather than query orchestration.
- Detection must be refactored internally to pass the per-query signal.
- Audio behavior requires a logic change in `useAutoPlayAudio.ts`; report the
  exact incompatibility for a follow-up plan.
- The proposed generation guard would require putting orchestration metadata in
  `QueryWordInfo` or `QueryResult`.
- Hook tests cannot isolate Raycast native modules without changing production
  imports; report the import chain.
- A required change touches a frozen file or any GitHub Action.
- Any verification command fails twice after one reasonable correction.

## Maintenance notes

- Cancellation saves resources; generation identity protects correctness even
  when an SDK/provider ignores cancellation. Keep both mechanisms.
- Any future async query action must carry its originating generation before it
  can mutate state.
- If losing detection providers are cancelled in a later plan, link their
  internal controller to the session signal introduced here.
- Reviewers should scrutinize all delayed stream flushes and `finally` blocks;
  these are the easiest places to accidentally read the current session instead
  of retaining the originating session.
