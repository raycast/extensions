# Plan 003: Remove verified dead result and provider types

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**: `git diff --stat 9368758..HEAD -- src/types/query.ts src/types/display.ts src/providers/translation/google.ts src/providers/translation/apple.ts src/providers/translation/volcano/index.ts src/providers/dictionary/youdao/types.ts`
> If any in-scope file changed since this plan was written, repeat every usage
> search in "Current state" before proceeding; any new consumer is a STOP
> condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `9368758`, 2026-07-18

## Why this matters

Several exported fields and provider response aliases have no consumers. They
make the public model appear broader than runtime behavior, retain unnecessary
imports, and invite new code to depend on abandoned shapes. This plan removes
only symbols whose absence is directly verified by repository-wide reference
search; it does not redesign result wrappers, generics, or provider protocols.

## Current state

- `src/types/query.ts:2-3,35-42` imports `RequestError` solely for the unused
  `QueryTypeResult.errorInfo` field:

  ```ts
  import type { RequestError } from "@/utils/errors";
  // ...
  errorInfo?: RequestError;
  ```

- `src/types/display.ts:17-29` contains two unused display payload fields:

  ```ts
  speech?: string;
  sourceData?: T;
  ```

- `src/providers/translation/google.ts:15-17` exports
  `GoogleTranslateResult`, with no import or use elsewhere.
- `src/providers/translation/apple.ts:14-16` exports `AppleTranslateResult`,
  with no import or use elsewhere.
- `src/providers/translation/volcano/index.ts:37-45` declares a detection
  response model inside the translation provider even though detection owns its
  own local model in `src/providers/detect/volcano.ts:14-19`.
- `src/providers/dictionary/youdao/types.ts:42` declares
  `YoudaoTranslateResult` as an unused alias of `YoudaoDictionaryResult`.
- Repository-wide searches at planning time found no consumers for these exact
  symbols/fields. Provider-specific response types that are actually used must
  remain intact, matching `AGENTS.md:69-72`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Usage check | `rg -n "GoogleTranslateResult|AppleTranslateResult|VolcanoDetectResult|YoudaoTranslateResult|\.errorInfo\b|\.sourceData\b|\.speech\b" src` | before edits, only declarations plus unrelated local `errorInfo`/provider speech fields; after edits, none of the targeted declarations |
| Typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Auto-fix lint | `npm run fix-lint` | exit 0 |
| Build | `npm run build` | exit 0 |

## Scope

**In scope**:

- `src/types/query.ts`
- `src/types/display.ts`
- `src/providers/translation/google.ts`
- `src/providers/translation/apple.ts`
- `src/providers/translation/volcano/index.ts`
- `src/providers/dictionary/youdao/types.ts`
- `plans/README.md` (status only)

**Out of scope**:

- Removing or changing `DisplaySection<T>` or `ListDisplayItem<T>` generics.
- Removing `StreamChunk.role` or changing streaming event objects.
- Reorganizing the remaining Youdao response types or duplicate interface
  declarations.
- Changing any runtime provider parsing, result construction, or display logic.
- Removing local variables named `errorInfo` or provider response fields named
  `speech`; those are not the dead public fields targeted here.
- Any credential, security-policy, or GitHub Actions change.

## Git workflow

- Branch: `codex/003-remove-dead-types`
- Keep this as one atomic commit.
- Commit message: `refactor(types): remove unused result models`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Re-run targeted usage searches

Run separate exact-symbol searches before deleting anything:

```bash
rg -n "\b(GoogleTranslateResult|AppleTranslateResult|YoudaoTranslateResult)\b" src
rg -n "\bVolcanoDetectResult\b" src
rg -n "sourceData\??:|\.sourceData\b|errorInfo\??:|\.errorInfo\b" src
rg -n "^[[:space:]]*speech\??:" src/types/display.ts
```

Expected: matches agree with the declarations listed in "Current state"; the
only legitimate `VolcanoDetectResult` after cleanup will be the detect
provider's local interface. If any new consumer exists, stop.

### Step 2: Remove unused public result fields

In `src/types/query.ts`, remove `QueryTypeResult.errorInfo` and the now-unused
`RequestError` type import. In `src/types/display.ts`, remove only
`ListDisplayItemBase.speech` and `ListDisplayItemBase.sourceData`.

Keep the generic parameters in place even if they become structurally unused;
their removal has wider API impact and is explicitly deferred.

**Verify**:

```bash
npx tsc --noEmit
```

Expected: exit 0.

### Step 3: Remove unused provider type declarations

Delete only these declarations:

- `GoogleTranslateResult` from `src/providers/translation/google.ts`
- `AppleTranslateResult` from `src/providers/translation/apple.ts`
- `VolcanoDetectResult` and its supporting
  `VolcanoDetectedLanguageList` from
  `src/providers/translation/volcano/index.ts`
- `YoudaoTranslateResult` from
  `src/providers/dictionary/youdao/types.ts`

Do not alter the used `VolcanoTranslateResult`, provider classes, or detect
provider's local `VolcanoDetectResult`.

**Verify**:

```bash
rg -n "\b(GoogleTranslateResult|AppleTranslateResult|YoudaoTranslateResult)\b" src
rg -n "\bVolcanoDetectedLanguageList\b" src/providers/translation
```

Expected: both commands exit 1 with no matches.

### Step 4: Run the full repository verification sequence

```bash
npx tsc --noEmit
npm run fix-lint
npm run build
```

Expected: every command exits 0. Report a network-only Raycast validation
failure as an environment blocker rather than editing unrelated metadata.

## Test plan

- No automated test runner exists, and this type-only cleanup must not introduce
  one.
- `npx tsc --noEmit` proves no TypeScript consumer depends on the removed
  exports or fields.
- `npm run build` proves Raycast bundling does not depend on the removed
  declarations.
- Review the final diff and confirm it contains no runtime expression changes.

## Done criteria

- [ ] All exact dead declarations listed in step 3 are absent.
- [ ] `QueryTypeResult.errorInfo`, `ListDisplayItemBase.speech`, and
  `ListDisplayItemBase.sourceData` are absent.
- [ ] The detect provider's live `VolcanoDetectResult` remains.
- [ ] No streaming, generic, provider parsing, or display behavior changed.
- [ ] `npx tsc --noEmit`, `npm run fix-lint`, and `npm run build` exit 0, or a
  network-only Raycast validation failure is reported without improvisation.
- [ ] No source files outside the in-scope list are modified.
- [ ] The status row in `plans/README.md` is updated.

## STOP conditions

Stop and report back if:

- Any targeted field or type has gained a real consumer since commit `9368758`.
- Removing a symbol requires modifying runtime logic or another source file.
- TypeScript reports that a generic must also be removed or redesigned.
- The used Volcano translation or detection response model cannot be clearly
  distinguished from the dead declaration.

## Maintenance notes

- Future cleanup can remove unused display generics only as a separately scoped
  API migration.
- Do not remove fields from provider raw-response interfaces merely because the
  formatter does not currently read them; provider response typing is preserved
  intentionally unless a dedicated response-model plan proves them obsolete.

