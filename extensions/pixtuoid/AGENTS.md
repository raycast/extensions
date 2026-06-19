# integrations/raycast — agent guide

The **Raycast extension**: a self-contained **TypeScript / Node** project (NOT
Rust) and a thin presenter over the `pixtuoid … --json` CLI contract. It ships
two commands — `Manage Sources` (connect/disconnect over `pixtuoid
sources|connect|disconnect --json`) and `Start Floating`. Parent guide: the
workspace [`../../CLAUDE.md`](../../CLAUDE.md). The cross-area development model
this consumer sits in: [`../../docs/PARALLEL-DELIVERY.md`](../../docs/PARALLEL-DELIVERY.md).

> **You are in the TS consumer, not the Rust producer.** The workspace
> `CLAUDE.md` still loads above this file — but its Rust house rules
> (TDD-in-Rust, `cargo`/`clippy`, `just preflight`, `semver`, `gen-check`)
> **do not apply here**. This is a Node project; the gates are `tsc` + `eslint`.
> Don't run `cargo` anything for a change scoped to this directory.

## What it is

A login-shell-resolved shell over the CLI — it does **not** bundle the binary
(resolves it via `$PATH` + a `binaryPath` preference). `src/pixtuoid.ts` is the
CLI bridge; `manage-sources.tsx` / `start-floating.tsx` are the Raycast command
UIs. No server, no state of its own — every fact comes from the CLI's JSON.

## The contract is GENERATED, not hand-mirrored (read this first)

`SourceStatus` is **generated**, not hand-typed. The Rust serde type
(`crates/pixtuoid/src/sources.rs`) emits a committed JSON Schema
(`contract/source-status.schema.json`, via its `schemars` derive + the
`source_status_schema_matches_the_committed_contract` golden test); `npm run gen:contract`
(json-schema-to-typescript) regenerates `src/contract.ts` from that schema; and
`pixtuoid.ts` re-exports the generated type (`export type { SourceStatus }`). So
a producer shape change **can't hand-drift** — three gates catch it: the Rust
struct↔schema golden test (`just test`), the schema↔TS-type freshness check
(raycast CI regenerates `contract.ts` and `git diff --exit-code`s it), and the
TS-type↔usage `tsc --noEmit` pass. **After changing `SourceStatus`, run
`just gen-contract`** (re-emits the schema + the TS type) and commit both.
`src/contract.ts` is generated — eslint/prettier-ignored, never hand-edit it.
This is `PARALLEL-DELIVERY.md`'s "codegen-from-one-source" applied to pixtuoid
itself. (`OutcomeRow` stays hand-typed — it's `{id, outcome: string}`, a
free-form token, not worth a schema; the `source_status_json_shape` byte test
still pins the exact wire JSON.)

## Sharp edges (don't be surprised by these)

- **A non-zero CLI exit DISCARDS stdout in the usual `execFile` path** — but the
  CLI still printed a JSON array. Recover it from `err.stdout` in the bridge; a
  toast-only error path is dead code (the failed approach). The `--json` outcome
  rows arrive even on a partial failure.
- **The `binaryPath` preference is RE-READ on every call**, not cached — only
  the PATH auto-detect is memoized. A user who fixes the pref mid-session
  shouldn't have to relaunch.
- **The toolchain pins (`Node 22` / `eslint 9` / `typescript 5`) MATCH Raycast's
  own toolchain — do NOT bump them ahead** of what `@raycast/api` expects, or
  `ray build` (store publish) breaks even though `tsc` passes.
- **`OutcomeRow.outcome` ∈ `connected | disconnected | failed: <msg>`** for the
  single-id `connect`/`disconnect` the extension calls; `no_op` is emitted only
  by `pixtuoid sources set` (the declarative reconcile this extension never
  invokes). Parse structurally, not by an exhaustive union.

## Gates

CI (`.github/workflows/raycast.yml`, Linux runner): `npm ci` → `npx tsc
--noEmit` → `npx eslint .`. Run those two locally before "done." **`ray build` /
`ray lint`** (manifest + icon validation, the Prettier pass) need the **macOS
Raycast app** and only run before a store publish — they are NOT in CI, so a
green PR does not prove the manifest is publishable. See the
[README](README.md) for `npm run {build,dev,lint}`.
