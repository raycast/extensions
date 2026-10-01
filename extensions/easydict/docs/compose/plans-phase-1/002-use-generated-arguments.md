# Plan 002: Use Raycast-generated command argument types

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md` unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**: `git diff --stat 9368758..HEAD -- src/easydict.tsx raycast-env.d.ts package.json`
> If any in-scope source or generated argument definition changed since this plan
> was written, compare the "Current state" excerpts against the live code before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `9368758`, 2026-07-18

## Why this matters

The `easydict` entry point manually duplicates the command argument shape from
the Raycast manifest. Raycast already generates `Arguments.Easydict` in
`raycast-env.d.ts`; using it prevents manifest and entry-point types from
drifting and directly follows this repository's type-safety guidance. The
runtime command behavior must remain unchanged.

## Current state

- `package.json:14-28` declares the `easydict` command and its `queryText`
  argument.
- `raycast-env.d.ts:109-117` is generated from the manifest and declares
  `Arguments.Easydict`. It explicitly warns that it must not be edited manually.
- `src/easydict.tsx:11-15` duplicates that type:

  ```ts
  interface EasydictArguments {
    queryText?: string;
  }

  export default function (props: LaunchProps<{ arguments: EasydictArguments }>) {
  ```

- `AGENTS.md:132-138` explicitly says not to manually define `Arguments`
  interfaces and to use generated types from `raycast-env.d.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Reference check | `rg -n "EasydictArguments|Arguments\.Easydict" src/easydict.tsx` | only `Arguments.Easydict` remains |
| Typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Auto-fix lint | `npm run fix-lint` | exit 0 |
| Build | `npm run build` | exit 0 |

## Suggested executor toolkit

- Use the local `raycast-extension` skill if available; this plan is specifically
  about Raycast-generated command argument typing.

## Scope

**In scope**:

- `src/easydict.tsx`
- `plans/README.md` (status only)

**Read-only references — do not modify**:

- `package.json`
- `raycast-env.d.ts`
- `AGENTS.md`

**Out of scope**:

- Changing whether `queryText` is required in the manifest.
- Regenerating or manually editing `raycast-env.d.ts`.
- Changing command behavior, fallback text handling, or the conflict UI.
- Editing any preference, credential, or GitHub Actions file.

## Git workflow

- Branch: `codex/002-use-generated-arguments`
- Keep this as one atomic commit.
- Commit message: `refactor(command): use generated argument types`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Remove the handwritten argument interface

Delete only the local `EasydictArguments` interface from `src/easydict.tsx`.

**Verify**:

```bash
rg -n "interface EasydictArguments" src/easydict.tsx
```

Expected: exit 1 with no matches.

### Step 2: Use the generated Raycast argument type

Change the `LaunchProps` instantiation to:

```ts
LaunchProps<{ arguments: Arguments.Easydict }>
```

Do not add an import for `Arguments`; it is a generated global namespace.

**Verify**:

```bash
rg -n 'LaunchProps<\{ arguments: Arguments\.Easydict \}>' src/easydict.tsx
```

Expected: exactly one match.

### Step 3: Run the full repository verification sequence

```bash
npx tsc --noEmit
npm run fix-lint
npm run build
```

Expected: every command exits 0. Treat a network-only Raycast manifest
validation failure as an environment blocker; do not edit manifest identities
to make an offline check pass.

## Test plan

- The repository has no automated test runner; do not add one in this plan.
- TypeScript is the primary regression check: it must prove that
  `props.arguments.queryText` remains accepted by `SearchWord`.
- The Raycast build must validate the command entry point against the manifest.

## Done criteria

- [ ] No handwritten `EasydictArguments` interface remains.
- [ ] `src/easydict.tsx` uses `Arguments.Easydict` without importing it.
- [ ] `package.json` and `raycast-env.d.ts` are unchanged.
- [ ] `npx tsc --noEmit`, `npm run fix-lint`, and `npm run build` exit 0, or a
  network-only Raycast validation failure is reported without source changes.
- [ ] No source file other than `src/easydict.tsx` is modified.
- [ ] The status row in `plans/README.md` is updated.

## STOP conditions

Stop and report back if:

- `Arguments.Easydict` no longer exists or its generated shape differs from the
  current manifest.
- TypeScript requires manually editing `raycast-env.d.ts`.
- The change appears to require altering argument requiredness or runtime
  fallback behavior.
- Any out-of-scope file must change.

## Maintenance notes

- Future command-argument changes belong in `package.json`; Raycast regeneration
  should update `raycast-env.d.ts`, and entry points should consume the generated
  namespace rather than introducing parallel interfaces.

