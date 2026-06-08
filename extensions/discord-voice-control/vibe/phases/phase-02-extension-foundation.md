# Phase 2: Extension Foundation

> **Changed in Phase 1 (2026-06-08).** The MVP is **shortcut-only, best-effort** (no state
> confirmation, no UI automation fallback). The `ControlMechanism` and `OutcomeStatus` enums below
> are kept as a superset so the model can grow, but the only **active** mechanism is `shortcut`.
> RPC confirmation was proven to work and is the documented upgrade path; see
> `vibe/phases/phase-01-results/decision-record.md`.

## Goal
Create the Raycast extension foundation, command surface, strict TypeScript setup, and internal result model without implementing real automation yet.

## Scope
This phase establishes structure and contracts. It should not try to solve Discord control logic yet.

## Work Items
- Create the Raycast extension project.
- Configure TypeScript strict mode.
- Add lint, format, typecheck, build, and test scripts.
- Create exactly three MVP commands:
  - Toggle Mute
  - Toggle Deafen
  - Check Voice Control Status
- Use `no-view` mode for the two toggle commands.
- Use a `view` command for status unless Phase 1 proves a no-view status command is better.
- Create module boundaries:
  - `commands`
  - `application`
  - `domain`
  - `infrastructure/discord-control`
  - `infrastructure/system`
  - `shared`
- Define the internal control interface that every mechanism must implement.
- Define discriminated result types for action and status outcomes.
- Define stable reason codes and error categories.
- Add placeholder adapters that return deterministic unavailable results.

## Suggested Domain Types
- `VoiceAction`: `toggleMute` or `toggleDeafen`
- `ControlMechanism`: `shortcut`, `uiAutomation`, `discordRpc`, `none` (MVP uses `shortcut` only; others reserved for later)
- `AvailabilityStatus`: `available`, `unavailable`, `degraded`, `unknown`
- `OutcomeStatus`: `success`, `unavailable`, `failed`, `unknown`
- `ReasonCode`: stable machine-readable string for every expected outcome
- `VoiceControlResult`: requested action, mechanism, availability, outcome, message, reason code, diagnostics

## Acceptance Criteria
- The extension can be opened in Raycast development mode.
- The manifest exposes exactly the three MVP commands.
- Toggle commands complete with clear placeholder unavailable feedback.
- The status command renders or reports current placeholder capability state.
- No command file contains raw shell, AppleScript, or UI automation logic.
- Typecheck, lint, format check, and tests can be run locally.
- Domain result types are covered by basic unit tests.

## Deliverables
- Raycast extension skeleton.
- Command files and internal folders.
- Shared domain result model.
- Initial test setup.
- Placeholder unavailable behavior that matches product messaging rules.

## Phase Gate
Proceed when the project can run in development mode and every command returns a typed, non-misleading result through the application layer.
