# AGENTS.md

## Purpose

This repository builds a Raycast extension that controls **macOS display brightness** using a **native Swift port** of the `nriley/brightness` approach.

## Current Product Scope

- Platform: **macOS only**.
- Command UX: **no-view commands only** (global hotkey friendly).
- Current functional target: support a command that sets brightness to **25%**.
- Keep existing sample command file (`src/set-brightness-to-25.ts`) unless explicitly asked to remove it.

## Hard Constraints

- Do not use third-party runtime dependencies for brightness control.
- Do not auto-install external tools/apps.
- Use only native Apple frameworks and system capabilities.
- Port brightness logic to Swift from `nriley/brightness` behavior where applicable.
- Do not support external monitors in this phase.
- Target the display under cursor; if unavailable, fall back to main display.

## Brightness Behavior Requirements

- Brightness range: **0-100**.
- Step size standard for step-based behavior: **6.25%**.
- Disable adaptive brightness behavior before applying explicit brightness (when detectable/applicable).
- Verify brightness changes using read-back + tolerance check (not fire-and-forget).
- Error handling must provide actionable remediation guidance.

## Raycast Manifest and UX Rules

- `platforms` must include only `macOS`.
- Commands must remain concise and user-facing in title/description.
- Maintain backward compatibility for command names/aliases once published.
- Use no-view command mode for hotkey workflows.
- Feedback policy:
  - Success: HUD and/or lightweight success toast as appropriate.
  - Failure: toast with clear action-oriented message.

## Tooling and Workflow

- Package manager: **bun**.
- Required quality gate before commit/merge:
  - `bun run lint`
  - `bun run build`
- Add lightweight tests for helper logic/parsing/validation where practical.
- Smoke test baseline: single-display Mac only.

## Code and Architecture Guidelines

- Keep TypeScript command layer thin; delegate display/brightness operations to Swift helper executable.
- Keep Swift code deterministic and side-effect minimal outside brightness operations.
- Validate all numeric inputs and clamp/reject invalid ranges.
- Keep logs minimal and avoid storing unnecessary device-identifying information.

## Release and Documentation Checklist

- Update `CHANGELOG.md` with user-visible behavior changes.
- Update `README.md` with command behavior, constraints, and setup notes.
- Ensure metadata/screenshots are current for any UX-visible command changes.
- Confirm manifest metadata aligns with actual command behavior.

## Definition of Done (Per Task)

A task is done only when all are true:

- Code implemented according to scope and constraints above.
- Lint passes.
- Build passes.
- Relevant lightweight tests pass.
- Single-display manual smoke test performed.
- Documentation/changelog updates included when behavior changes.

## Git Safety Rules

- Do not use destructive git commands (`git reset --hard`, forced checkout of unrelated files, history rewrites) unless explicitly requested.
- Never revert unrelated local changes.
