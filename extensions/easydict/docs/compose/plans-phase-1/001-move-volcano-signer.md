# Plan 001: Move the shared Volcano signer to the shared provider boundary

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**: `git diff --stat 9368758..HEAD -- src/providers/detect/volcano.ts src/providers/translation/volcano/index.ts src/providers/translation/volcano/volcanoSign.js src/providers/shared/volcano-sign.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `9368758`, 2026-07-18

## Why this matters

Volcano translation and Volcano detection both use the same signing
implementation, but the shared signer currently lives inside the translation
provider directory. Detection therefore imports a translation-provider
internal, violating the repository rule that provider implementations stay
isolated. Moving the existing implementation unchanged to `providers/shared`
makes the real ownership explicit without introducing a new abstraction or
changing request behavior.

## Current state

- `src/providers/translation/volcano/volcanoSign.js` contains the complete
  `genVolcanoSign(query, params)` implementation.
- `src/providers/translation/volcano/index.ts:10-11` currently imports locally:

  ```ts
  import { BaseTranslateProvider } from "../base";
  import { genVolcanoSign } from "./volcanoSign";
  ```

- `src/providers/detect/volcano.ts:10` crosses provider categories:

  ```ts
  import { genVolcanoSign } from "../translation/volcano/volcanoSign";
  ```

- The applicable repository convention in `AGENTS.md:69-72` is to keep provider
  implementations isolated, use shared abstractions only when multiple
  providers genuinely consume them, and use `@/` imports across module
  boundaries. `src/providers/shared/tencent-sign.ts` is the neighboring example
  for a vendor signing helper owned by the shared provider layer.
- TypeScript has `allowJs: true`, so this plan deliberately preserves the signer
  as JavaScript. Converting it to TypeScript or changing the signing algorithm is
  separate work.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Reference check | `rg -n "volcanoSign|volcano-sign|genVolcanoSign" src/providers` | exactly two consumer imports plus the shared definition after the move |
| Typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Auto-fix lint | `npm run fix-lint` | exit 0 |
| Build | `npm run build` | exit 0 |

## Suggested executor toolkit

- Use the local `raycast-extension` skill if available to preserve Raycast
  extension import and build conventions.

## Scope

**In scope** (the only source files you should modify):

- `src/providers/translation/volcano/volcanoSign.js` (move/remove)
- `src/providers/shared/volcano-sign.js` (create by moving the existing file)
- `src/providers/translation/volcano/index.ts`
- `src/providers/detect/volcano.ts`
- `plans/README.md` (status only)

**Out of scope**:

- Any modification to the signing algorithm, credential lookup, canonical
  request, headers, service, region, endpoint, or exported function signature.
- Converting the signer from JavaScript to TypeScript.
- Refactoring other Volcano request or response types.
- Any credential, security-policy, or GitHub Actions change.

## Git workflow

- Branch: `codex/001-move-volcano-signer`
- Keep this as one atomic commit.
- Commit message: `refactor(volcano): move signer to shared providers`
- Do not push or open a PR unless the operator explicitly instructs it.

## Steps

### Step 1: Move the signer without changing its contents

Move `src/providers/translation/volcano/volcanoSign.js` to
`src/providers/shared/volcano-sign.js`. Preserve the file contents byte-for-byte
apart from formatter changes automatically required by repository tooling.

**Verify**:

```bash
test -f src/providers/shared/volcano-sign.js && test ! -e src/providers/translation/volcano/volcanoSign.js
```

Expected: exit 0.

### Step 2: Point both consumers at the shared module

In both Volcano providers, replace the old relative signer import with:

```ts
import { genVolcanoSign } from "@/providers/shared/volcano-sign";
```

Do not change the same-directory/base imports unless `npm run fix-lint` performs
a required import ordering change.

**Verify**:

```bash
rg -n 'translation/volcano/volcanoSign|translation/volcano/volcano-sign|from "\./volcanoSign"' src/providers
```

Expected: exit 1 with no matches.

### Step 3: Run the full repository verification sequence

Run, in order:

```bash
npx tsc --noEmit
npm run fix-lint
npm run build
```

Expected: every command exits 0. If Raycast manifest validation fails solely
because its online API cannot be reached, stop and report the environment failure
rather than changing source or manifest data.

## Test plan

- No test framework exists in this repository, and this plan must not introduce
  one. The change is a module relocation with no algorithm edits.
- TypeScript verifies both consumers resolve the new module; the Raycast build
  verifies the JavaScript signer is included in the extension bundle.
- Reviewer check: `git diff --no-ext-diff -- src/providers/shared/volcano-sign.js src/providers/translation/volcano/volcanoSign.js` should show a pure move/rename rather than logic changes.

## Done criteria

- [ ] `src/providers/shared/volcano-sign.js` exists and exports
  `genVolcanoSign`.
- [ ] The old translation-owned signer path no longer exists.
- [ ] Translation and detection import the signer through the `@/providers/shared/`
  alias.
- [ ] No signing logic or credential behavior changed.
- [ ] `npx tsc --noEmit`, `npm run fix-lint`, and `npm run build` exit 0, or a
  network-only Raycast validation failure is reported without improvisation.
- [ ] No source files outside the in-scope list are modified.
- [ ] The status row in `plans/README.md` is updated.

## STOP conditions

Stop and report back if:

- The signer or either import has changed since commit `9368758`.
- The move requires changing `genVolcanoSign` parameters, output, credential
  handling, or request signing.
- Another runtime consumer outside the two known Volcano providers appears.
- Verification suggests JavaScript files under `providers/shared` are not bundled.
- Completing the move appears to require touching any frozen area.

## Maintenance notes

- New Volcano capabilities that use the same signing protocol should import this
  shared helper rather than depending on another provider category.
- A later, separately reviewed plan may convert the signer to strict TypeScript;
  this move intentionally does not mix that risk into the boundary correction.

