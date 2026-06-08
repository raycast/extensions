# Phase 7: Testing And Diagnostics

> **Changed in Phase 1 (2026-06-08).** Shortcut-only, best-effort. Removed tests for fallback
> selection, the UI-automation adapter contract, state-transition rules, and one-fallback-only
> behavior (none exist in the MVP). Added a test asserting best-effort "sent" wording is never
> confirmed-state wording. See `vibe/phases/phase-01-results/decision-record.md`.

## Goal
Add the automated coverage and local diagnostics needed to keep the extension reliable as automation behavior is refined.

## Scope
Automated tests should cover deterministic decision logic. Real Discord behavior remains a manual release gate.

## Work Items
- Add unit tests for:
  - domain result types
  - availability decisions (Discord running, permissions, shortcut configured)
  - reason-code-to-message mapping
  - permission failure normalization
  - best-effort message safety (no outcome uses confirmed-state wording like "muted"/"deafened")
- Add mocked integration tests for:
  - shortcut adapter contract
  - application orchestration
  - status command view model
- Add local structured diagnostics with opt-in persistence.
- Store diagnostics only in a local Raycast support path or equivalent local project-approved path.
- Ensure diagnostics include:
  - timestamp
  - requested action
  - selected mechanism (always `shortcut` in MVP)
  - outcome status
  - reason code
  - sanitized diagnostic detail
- Ensure diagnostics exclude:
  - message content
  - server names
  - channel names
  - account tokens
  - unnecessary system snapshots
- Add a local quality command that runs typecheck, lint, tests, and formatting checks.

## Acceptance Criteria
- All core decision logic has unit coverage.
- Mocked integration tests verify the command/application/infrastructure boundary.
- Best-effort success, unavailable, and failed outcomes are tested; no outcome uses confirmed-state wording.
- Unknown outcomes are tested separately from failed outcomes.
- Diagnostic logging is opt-in.
- Logs are local only and do not contain Discord content or secrets.
- Quality checks can be run before manual release validation.

## Deliverables
- Unit test suite.
- Mocked integration test suite.
- Diagnostic logging helper.
- Quality check scripts.
- Updated developer notes for running checks.

## Phase Gate
Proceed when automated checks protect the product's trust model and all deterministic behavior can be tested without a live Discord session.
