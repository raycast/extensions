# Plan 011: Spike a typed show-entry model instead of text round-tripping

> **Executor instructions**: This is a design/spike plan. Do not refactor source code in this plan. Create a design note and update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- src/rpass/application/rpass-client.ts src/vault/domain/vault-entry-content.ts src/vault/presentation/content.tsx src/vault/presentation/otp-row.tsx`
> If show-entry parsing changed, compare this plan against live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/002-add-rpass-client-contract-tests.md; plans/003-preserve-extra-lines-without-undefined-values.md
- **Category**: direction
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

The CLI now returns strict JSON for `show --json`, but the extension converts that JSON back to newline text and then reparses it into UI rows. Plan 003 patches a concrete bug in that text parser, but a typed model could better preserve `password`, `fields`, `otp_uri`, and `extra_lines` without ambiguity. This spike should decide whether a typed refactor is worth doing and define a safe migration path.

## Current state

Relevant files:

- `src/rpass/application/rpass-client.ts` — defines internal `ShowEntryJson`, formats it into text.
- `src/vault/domain/vault-entry-content.ts` — reparses text into `VaultEntryRow[]`.
- `src/vault/presentation/content.tsx` — calls `showEntry` and renders rows.
- `src/vault/presentation/otp-row.tsx` — calls `generateOtp` based on entry, not OTP URI.

Current excerpts:

```ts
// src/rpass/application/rpass-client.ts:106-110
interface ShowEntryJson {
  password: string;
  fields: { name: string; value: string }[];
  otp_uri?: string;
  extra_lines: string[];
}
```

```ts
// src/rpass/application/rpass-client.ts:125-133
function formatShowEntryOutput(entry: ShowEntryJson): string {
  return [
    entry.password,
    ...entry.fields.map((field) => `${field.name}: ${field.value}`),
    entry.otp_uri,
    ...entry.extra_lines,
  ]
    .filter(Boolean)
    .join("\n");
}
```

```ts
// src/vault/domain/vault-entry-content.ts:9-18
export function parseVaultEntryRows(content: string): VaultEntryRow[] {
  return content
    .split("\n")
    .filter(Boolean)
    .map((line, idx) => {
      if (TOTP_PATTERN.test(line)) return { idx, name: "otpauth", value: line };
      if (idx === 0) return { idx, name: "pass", value: line };
      const [name, value] = line.split(/:\s?(.*)/, 2);
      return { idx, name, value };
    });
}
```

## Commands you will need

| Purpose           | Command                                                          | Expected on success |
| ----------------- | ---------------------------------------------------------------- | ------------------- |
| Inspect show path | `grep -RIn "ShowEntryJson\|parseVaultEntryRows\|showEntry(" src` | shows current path  |
| Tests             | `npm test`                                                       | exit 0              |

## Scope

**In scope**:

- Create `plans/spikes/typed-show-entry-model.md`.
- Read-only investigation of the current show-entry path.

**Out of scope**:

- Changing `showEntry` return type now.
- Refactoring UI components.
- Changing OTP generation behavior.

## Git workflow

- Suggested branch: `advisor/011-spike-typed-show-entry-model`.
- Commit message if committing: `docs(plans): evaluate typed show entry model`.

## Steps

### Step 1: Map the current data flow

In the spike note, document the exact current flow:

`rpass show --json` → `ShowEntryJson` → `formatShowEntryOutput` string → `parseVaultEntryRows` → `Content` rows → `OtpRow` for rows named `otpauth`.

**Verify**: `grep -n "Current data flow" plans/spikes/typed-show-entry-model.md` → exists.

### Step 2: Define a candidate typed domain model

Propose a small exported model such as:

```ts
interface VaultEntryContent {
  password: string;
  fields: { name: string; value: string }[];
  otpUri?: string;
  extraLines: string[];
}
```

Define how to convert it to render rows without losing field vs extra-line identity. Include migration strategy that keeps current UI behavior first, then removes text parsing once tests pass.

**Verify**: `grep -n "VaultEntryContent\|migration" plans/spikes/typed-show-entry-model.md` → shows the design.

### Step 3: Decide whether to proceed

End the spike with a recommendation. If plan 003 fully resolves current bugs and write flows are not imminent, recommend deferring. If multiple future flows need typed content, recommend a follow-up implementation plan.

**Verify**: `grep -n "Recommendation" plans/spikes/typed-show-entry-model.md` → exists.

## Test plan

No source tests are required. The design note must list future tests for password, fields with colons in values, OTP URI, extra lines, and invalid JSON.

## Done criteria

- [ ] `plans/spikes/typed-show-entry-model.md` exists.
- [ ] It maps the current flow and proposes a typed model.
- [ ] It includes a migration strategy and future test list.
- [ ] It recommends proceed/defer with reasons.
- [ ] Source files are unchanged.
- [ ] `plans/README.md` status row for plan 011 is updated.

## STOP conditions

Stop and report if:

- The live code has already moved to a typed model.
- The design requires changing the Rust CLI contract.

## Maintenance notes

Do not use this spike to justify a broad refactor unless tests from plans 002 and 003 are in place. The current text path is acceptable once the no-colon bug is fixed.
