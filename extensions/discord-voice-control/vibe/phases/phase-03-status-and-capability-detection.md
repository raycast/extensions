# Phase 3: Status And Capability Detection

> **Changed in Phase 1 (2026-06-08).** Shortcut-only, best-effort. Removed the UI-automation
> fallback capability check and the "degraded because confirmation unavailable" state (there is no
> confirmation source). Status reports **readiness to attempt** only — it cannot report actual
> voice state, and no-voice-context cannot be detected. See
> `vibe/phases/phase-01-results/decision-record.md`.

## Goal
Implement the `Check Voice Control Status` command and shared capability checks so users can understand whether the extension is ready to attempt an action before trying.

## Scope
This phase focuses on readiness detection and explanation, not state-changing behavior. Note that
"readiness" here means *able to dispatch the shortcut*, not *able to confirm the result* — the MVP
has no confirmation source.

## Work Items
- Detect whether Discord is installed.
- Detect whether Discord is running.
- Target Discord Stable (`com.hnc.Discord`); PTB/Canary are out of scope for MVP.
- Detect whether required macOS permissions (Accessibility) appear available.
- Detect whether the configured shortcut mapping is present (enough to attempt a dispatch).
- Add preference reads for app target, shortcut mapping, and diagnostic logging opt-in.
- Build status result mapping for:
  - ready (Discord running + Accessibility granted + shortcut configured)
  - unavailable because Discord is not running
  - blocked because macOS permissions are missing
  - blocked because setup is incomplete (shortcut mapping not configured)
- Add user-facing actions where useful, such as opening extension preferences.

## Status UX Rules
- Status should explain the current readiness in user terms.
- Status should distinguish missing setup from runtime unavailability.
- Status should avoid raw script, shell, or OS error text.
- Status should tell the user the next useful step when one exists.
- Status should not expose Discord account, server, or channel content.
- Status should make clear the extension acts **best-effort**: it can send the toggle but cannot
  confirm the resulting voice state.

## Acceptance Criteria
- The status command reports Discord installed/running state.
- The status command reports the active control mechanism (shortcut) and that no fallback or
  confirmation exists in the MVP.
- Missing permission states are clear and actionable.
- Missing shortcut configuration is clear and actionable.
- Status makes the best-effort limitation explicit (cannot verify actual voice state).
- Capability checks are reusable by toggle actions.
- Unit tests cover capability-to-message mapping.

## Deliverables
- Status command implementation.
- Capability probe interfaces.
- Preference access layer.
- Status result tests.
- Updated setup notes for required permissions and preferences.

## Phase Gate
Proceed when a user can run the status command and understand whether the extension is ready to attempt a mute/deafen action, and that outcomes are best-effort (sent, not confirmed).
