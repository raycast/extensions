# Phase 8: Manual Validation And Release Readiness

> **Changed in Phase 1 (2026-06-08).** Shortcut-only, best-effort. The release gate validates
> reliable **control** plus honest **"sent" messaging**, not confirmed voice state (there is no
> confirmation source). Fallback-path scenarios are removed. See
> `vibe/phases/phase-01-results/decision-record.md`.

## Goal
Validate the MVP against real Discord on macOS and prepare a release-ready local extension.

## Scope
This phase confirms behavior that automated tests cannot prove: Discord client behavior, macOS permissions, focus behavior, and real user feedback timing.

## Manual Test Matrix

### Environment
- macOS version recorded.
- Raycast version recorded.
- Node and npm versions recorded.
- Discord variant and version recorded.
- Extension preferences recorded.
- macOS permissions recorded.

### Core Scenarios
- Toggle mute while Discord is focused.
- Toggle mute while another app is focused.
- Toggle deafen while Discord is focused.
- Toggle deafen while another app is focused.
- Run status while Discord is running and in voice.
- Run status while Discord is running but not in voice.
- Run status while Discord is closed.
- Run each toggle while Discord is closed.
- Run each toggle with required macOS permission missing.
- Run each toggle with shortcut configuration missing or incorrect.
- Confirm no command implies a confirmed voice state; success wording stays best-effort ("sent").

### Regression Scenarios
- Toggle mute twice and verify (by eye in Discord) state returns to the original value.
- Toggle deafen twice and verify (by eye in Discord) state returns to the original value.
- Trigger commands rapidly and verify no uncontrolled repeated toggles.
- Switch focus between apps and verify the extension does not leave the user in an unexpected app unless documented.
- Revoke and restore Accessibility permission.
- Restart Discord and Raycast, then rerun status.

## Release Readiness Work Items
- Write a concise setup guide.
- Document required macOS permissions.
- Document supported Discord variants.
- Document known limitations.
- Document troubleshooting steps for unavailable and unknown outcomes.
- Confirm command names, descriptions, icons, and keywords are clear.
- Confirm the extension has no backend, telemetry, or remote storage.
- Confirm dependencies are justified and minimal.
- Run all automated quality checks.
- Complete the manual test matrix.
- Decide whether the MVP is local-only release-ready, needs more implementation work, or requires requirement changes.

## Acceptance Criteria
- All core scenarios pass or have documented requirement-approved limitations.
- Manual validation confirms (by eye) that mute and deafen toggle reliably from outside Discord.
- User-facing messages match observed outcomes and stay best-effort ("sent", never "muted").
- The extension handles invalid situations without implying a confirmed voice state.
- Known limitations — including "no state confirmation" — are documented in user terms.
- The final go/no-go decision is recorded.

## Deliverables
- Completed manual validation checklist.
- Setup and troubleshooting documentation.
- Known limitations section.
- Release readiness decision.
- Follow-up backlog for post-MVP improvements.

## Phase Gate
The MVP is complete only when real-world validation shows that users can toggle mute and deafen from outside Discord with clear, trustworthy, best-effort outcomes (control is reliable and messaging never claims an unverified state).
