# integrations/raycast — agent guide

The **Raycast extension**: a self-contained **TypeScript / Node** project (NOT
Rust) and a thin presenter over the `pixtuoid … --json` CLI contract. It ships
two commands — `Manage Sources` (connect/disconnect over `pixtuoid
sources|connect|disconnect --json`) and `Start Floating`. Parent guide: the
workspace [`../../AGENTS.md`](../../AGENTS.md).

> **You are in the TS consumer, not the Rust producer.** The workspace
> `AGENTS.md` still loads above this file — but its Rust house rules
> (TDD-in-Rust, `cargo`/`clippy`, `just preflight`, the crate CI gates)
> **do not apply here**. This is a Node project; the gates are `tsc` + `eslint` + `npm test`.
> Don't run `cargo` anything for a change scoped to this directory; the
> pre-push hook still runs `just preflight`.

## What it is

A login-shell-resolved shell over the CLI — it does **not** bundle the binary (resolves it via
`$PATH` + a `binaryPath` preference). `src/pixtuoid.ts` is the CLI bridge; `manage-sources.tsx` /
`start-floating.tsx` are the Raycast command UIs. No server, no state of its own — every fact
comes from the CLI: its `--json` rows, and Start Floating's ready line, exit code and stderr.

## The contract is GENERATED, not hand-mirrored (read this first)

BOTH wire types — `SourceStatus` AND `OutcomeRow` — are **generated**, not
hand-typed. The Rust serde types (`crates/pixtuoid/src/sources.rs`) emit
committed JSON Schemas (`contract/source-status.schema.json` +
`contract/outcome-row.schema.json`, via their `schemars` derives + the
`*_schema_matches_the_committed_contract` golden tests); `npm run gen:contract`
(json-schema-to-typescript) regenerates `src/contract.ts` +
`src/contract-outcome.ts` from those schemas; and `pixtuoid.ts` re-exports the
generated types (`export type { SourceStatus }` / `{ OutcomeRow }`). So a
producer shape change **can't hand-drift** — three gates catch it: the Rust
struct↔schema golden tests (`just test`), the schema↔TS-type freshness check
(raycast CI regenerates both files and `git diff --exit-code`s them), and the
TS-type↔usage `tsc --noEmit` pass. **After changing `SourceStatus` or
`OutcomeRow`, run `just gen-contract`** (re-emits the schemas + the TS types)
and commit all of it. `src/contract.ts` / `src/contract-outcome.ts` are
generated — eslint/prettier-ignored, never hand-edit them.
At runtime `src/conforms.ts` checks every CLI row against the same committed
schemas and fails closed on drift (`npm test`), so a stale schema there breaks
the extension, not only the types.
(`outcome_row_json_shape` pins `OutcomeRow`'s exact wire JSON, the
`sources --json` golden and schema test `SourceStatus`'s; `OutcomeRow`'s doc
comment in `crates/pixtuoid/src/sources.rs` owns the published-wire rule.)

## Toolchain policy

`package.json` cannot carry a comment, so these live here.

- **Toolchain bumps must stay within what Raycast DECLARES — check the peers,
  don't guess.** `eslint`/`typescript` are gated by `@raycast/eslint-config`'s
  peerDependencies — read the installed version's ranges before a bump;
  `@types/node` stays on its current major (`.github/dependabot.yml` ignores
  its major updates; minors still flow). `@raycast/api`'s exact peer is a warning-level
  mismatch npm tolerates under the committed lockfile, not a hard pin the
  manifest must equal. `ray build` type-checks with its OWN bundled tsc (read
  its version from the installed `@raycast/api`), so `tsconfig.json` must stay
  parseable by BOTH that and the local TS: hence `moduleResolution: "Bundler"` +
  an explicit `types: ["node"]` (TS 6.0 stopped auto-including
  `node_modules/@types`), and no `ignoreDeprecations` value the bundled tsc
  rejects.

## Gates

CI runs `.github/workflows/raycast.yml`'s steps on a Linux runner, on a PR that
touches this directory, and `ci-gate` judges them; run them
locally before "done." `ray build` writes `raycast-env.d.ts`, the
manifest's generated `Preferences` that `tsc` reads, and `ray lint` validates
the manifest, icons and metadata and runs the Prettier pass. See the
[README](README.md) for `npm run {build,dev,lint}`.

- **Install scripts fail closed, as site's**: `strict-allow-scripts` with an
  exact-version `allowScripts`, enforced by the npm 12 CI pins
  (`setup-npm`); review with `npm install-scripts ls`.
- **`npm run audit` is plain `npm audit --audit-level=low`, same as site's.**
  `npm audit` has no per-advisory ignore, so if an unfixable advisory recurs
  here, restore the per-advisory allow-list script from history rather than
  lowering `--audit-level`,
  which blinds a whole severity band to hide one id. Unfixable is realistic —
  a transitive chain we own no link of — and an `overrides` patch can green the
  audit over code that throws (#792).
- **A chord Raycast RESERVES is swallowed, so its Action is unreachable — and
  `@raycast/no-reserved-shortcut` is escalated to `error` here.** Upstream ships
  it at warn and `eslint .` exits 0 on warnings, which is how an `Open Extension
  Preferences` action bound to `⌘,` (Raycast's own `OpenPreferences`) shipped
  dead: `tsc` types the chord fine, and `ray lint` exits 0 on a warning too.
  Its sibling `@raycast/prefer-common-shortcut` stays a warning — style advice
  a routine version bump could turn into a surprise red.
