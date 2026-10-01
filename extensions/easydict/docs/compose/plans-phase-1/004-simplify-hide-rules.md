# Plan 004: Replace the two-entry hide-rule framework with direct logic

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**: `git diff --stat 9368758..HEAD -- src/core/query/hideRules.ts src/features/search/useQueryEngine.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch, treat
> it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `9368758`, 2026-07-18

## Why this matters

Two fixed display conditions are represented as an exported interface, an
exported rules array, trigger arrays, callbacks, and a loop. Neither callback
uses the `type` argument, and no module consumes the rule objects directly. A
single direct function expresses the behavior more clearly while preserving the
existing `computeHideDisplay(type)` API used by the query engine.

## Current state

- `src/core/query/hideRules.ts:7-32` defines `HideRule`, `HIDE_RULES`, and a loop.
  The only two behaviors are:

  ```ts
  type === TranslationType.DeepL
    -> !myPreferences.enableDeepLTranslate

  type === TranslationType.Youdao
    -> myPreferences.enableYoudaoDictionary && !myPreferences.enableYoudaoTranslate
  ```

- `src/features/search/useQueryEngine.ts:11,151` imports and calls only
  `computeHideDisplay(type)`; it does not import `HideRule` or `HIDE_RULES`.
- Repository-wide reference search at planning time found no other consumers.
- This simplification follows `AGENTS.md:110-118`: keep logic close to usage and
  avoid abstractions that do not represent a reusable boundary.
- `src/core/query/couplingRules.ts` is intentionally out of scope. Its rules
  perform multiple nontrivial cross-provider transforms and are not equivalent
  to these two boolean checks.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Reference check | `rg -n "HideRule|HIDE_RULES|computeHideDisplay" src` | before: declarations plus one consumer; after: only function plus one consumer |
| Typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Auto-fix lint | `npm run fix-lint` | exit 0 |
| Build | `npm run build` | exit 0 |

## Scope

**In scope**:

- `src/core/query/hideRules.ts`
- `plans/README.md` (status only)

**Read-only verification reference**:

- `src/features/search/useQueryEngine.ts`

**Out of scope**:

- Changing `computeHideDisplay`'s name, parameters, return type, or import path.
- Changing DeepL/Youdao enablement, implicit coupling, or preference semantics.
- Modifying `couplingRules.ts`, provider registries, `useQueryEngine.ts`, or
  preferences.
- Generalizing the function for future hypothetical rules.
- Any credential, security-policy, or GitHub Actions change.

## Git workflow

- Branch: `codex/004-simplify-hide-rules`
- Keep this as one atomic commit.
- Commit message: `refactor(query): simplify result hide rules`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Confirm the exported rule objects have no consumers

```bash
rg -n "\b(HideRule|HIDE_RULES)\b" src --glob '*.{ts,tsx}'
```

Expected: matches only in `src/core/query/hideRules.ts`. Any external consumer
is a STOP condition.

### Step 2: Replace the rule framework with direct branches

In `src/core/query/hideRules.ts`:

- Remove the `HideRule` interface.
- Remove the `HIDE_RULES` array.
- Keep the existing imports needed by the direct function.
- Implement `computeHideDisplay(type: QueryType): boolean` using direct branches
  for DeepL and Youdao, followed by `return false`.
- Preserve the two boolean expressions exactly; do not simplify or reinterpret
  preference coupling.

Target shape:

```ts
export function computeHideDisplay(type: QueryType): boolean {
  if (type === TranslationType.DeepL) {
    return !myPreferences.enableDeepLTranslate;
  }

  if (type === TranslationType.Youdao) {
    return myPreferences.enableYoudaoDictionary && !myPreferences.enableYoudaoTranslate;
  }

  return false;
}
```

**Verify**:

```bash
rg -n "\b(HideRule|HIDE_RULES)\b" src
npx tsc --noEmit
```

Expected: the first command exits 1 with no matches; TypeScript exits 0.

### Step 3: Run the full repository verification sequence

```bash
npx tsc --noEmit
npm run fix-lint
npm run build
```

Expected: every command exits 0. If online Raycast manifest validation is the
only failure, report it without editing unrelated files.

## Test plan

- The repository has no test runner, so this plan must not introduce one.
- Review the direct function against the two current rule callbacks and confirm
  an exact truth-table match:
  - DeepL hidden iff `enableDeepLTranslate` is false.
  - Youdao hidden iff dictionary is enabled and translation is disabled.
  - Every other `QueryType` returns false.
- TypeScript and the Raycast build verify the existing query-engine consumer.

## Done criteria

- [ ] `HideRule` and `HIDE_RULES` no longer exist.
- [ ] `computeHideDisplay` retains the same public signature and import path.
- [ ] DeepL, Youdao, and default behavior match the current expressions exactly.
- [ ] `src/features/search/useQueryEngine.ts` and `couplingRules.ts` are unchanged.
- [ ] `npx tsc --noEmit`, `npm run fix-lint`, and `npm run build` exit 0, or a
  network-only Raycast validation failure is reported without improvisation.
- [ ] No source file outside `src/core/query/hideRules.ts` is modified.
- [ ] The status row in `plans/README.md` is updated.

## STOP conditions

Stop and report back if:

- `HideRule` or `HIDE_RULES` has an external consumer.
- Existing preference expressions have changed since commit `9368758`.
- Preserving behavior appears to require modifying `useQueryEngine` or a
  provider registry.
- A reviewer requests folding coupling rules into this cleanup; that is a
  separate architectural decision.

## Maintenance notes

- If hide behavior grows to several genuinely data-driven rules, reintroduce a
  declarative structure based on demonstrated needs rather than preserving this
  two-rule framework preemptively.
- Keep cross-service result transformations in `couplingRules.ts`; this plan does
  not imply that all declarative query rules are unnecessary.

