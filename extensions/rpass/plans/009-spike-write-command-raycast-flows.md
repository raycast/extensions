# Plan 009: Spike Raycast write flows for future rpass commands

> **Executor instructions**: This is a design/spike plan, not an implementation plan. Do not build write commands unless the spike explicitly concludes with a reviewed follow-up plan. Run every verification command and update `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 1cf4ad9..HEAD -- AGENTS.md package.json src`
> If the CLI roadmap or extension command structure changed, compare this plan against the live repo before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/008-add-readme-for-setup-and-cli-contract.md
- **Category**: direction
- **Planned at**: commit `1cf4ad9`, 2026-06-11

## Why this matters

`AGENTS.md` says the Rust CLI roadmap includes `generate`, `rm`, and `mv`, followed by git and recipient management. The Raycast extension currently only browses/decrypts/copies entries. A spike should define the safest Raycast UX and CLI contract requirements before adding destructive write flows.

## Current state

Relevant files:

- `AGENTS.md` — authoritative CLI roadmap and safety rules.
- `package.json` — declares only one Raycast command today: `vault`.
- `src/vault.tsx` and `src/vault/presentation/*` — current read-only vault UI.

Current roadmap excerpt from `AGENTS.md`:

```text
Phase 2 remaining write commands:
rpass generate <entry> <length>
rpass rm <entry>
rpass mv <old-entry> <new-entry>
Recommended order:
1. generate — least destructive;
2. rm — destructive, needs careful confirmation/force behavior;
3. mv — more complex because it touches paths, overwrite policy, directories, and recipients.
```

## Commands you will need

| Purpose          | Command                                                                                         | Expected on success                         |
| ---------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Inspect manifest | `node -e "const p=require('./package.json'); console.log(p.commands.map(c=>c.name).join(','))"` | prints current commands                     |
| Typecheck        | `npx tsc --noEmit`                                                                              | exit 0 if any docs-only imports are checked |
| Tests            | `npm test`                                                                                      | exit 0                                      |

## Scope

**In scope**:

- Create `plans/spikes/write-command-flows.md` or similar design note.
- Read-only investigation of `AGENTS.md`, `package.json`, and current source.

**Out of scope**:

- Implementing generate/rm/mv UI.
- Modifying source code.
- Invoking real `rpass` write commands.

## Git workflow

- Suggested branch: `advisor/009-spike-write-flows`.
- Commit message if committing: `docs(plans): design raycast write flows`.

## Steps

### Step 1: Inventory current Raycast surface

Document the current single command, preferences, and read-only actions. Note where a future write action could live: command palette actions inside an entry, separate commands, or both.

**Verify**: `node -e "const p=require('./package.json'); console.log(JSON.stringify(p.commands,null,2))"` → shows current command definitions.

### Step 2: Define UX and safety requirements per CLI command

In the spike note, write separate sections for `generate`, `rm`, and `mv`:

- user story,
- required Raycast form fields/actions,
- confirmation requirements,
- needed CLI JSON success/error contract,
- rollback/safety expectations,
- tests needed before implementation.

Use the `AGENTS.md` guidance: `generate` first, `rm` destructive confirmation, `mv` overwrite/directory/recipient complexity.

**Verify**: `grep -n "generate\|rm\|mv\|confirmation\|--json" plans/spikes/write-command-flows.md` → shows relevant sections.

### Step 3: Produce follow-up plan recommendations

End the spike note with recommended next implementation plans in dependency order. The first should be a non-destructive `generate` UI only if the CLI command is already available and has a stable JSON/error contract.

**Verify**: `grep -n "Recommended follow-up" plans/spikes/write-command-flows.md` → exists.

## Test plan

No product tests are required; this is a design artifact. Normal repo tests should still pass because source is unchanged.

## Done criteria

- [ ] A spike note exists under `plans/spikes/`.
- [ ] It covers `generate`, `rm`, and `mv` separately.
- [ ] It explicitly forbids `--passphrase <value>` and requires `--passphrase-stdin` where needed.
- [ ] It recommends follow-up implementation plans instead of implementing directly.
- [ ] Source files are unchanged.
- [ ] `plans/README.md` status row for plan 009 is updated.

## STOP conditions

Stop and report if:

- The CLI roadmap in `AGENTS.md` has changed substantially.
- The Rust CLI commands are not available or lack JSON contracts; do not implement UI against guesswork.

## Maintenance notes

This spike should be revisited after the Rust CLI lands each write command. Treat destructive flows as separate implementation plans with explicit manual verification.
