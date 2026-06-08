# Phase 4: Shortcut Control Path

> **Changed in Phase 1 (2026-06-08).** This is the **only** control path (no UI automation
> fallback) and the MVP is **best-effort** (no state confirmation). A no-error dispatch is reported
> as best-effort success with "sent" wording — never an asserted voice state. See
> `vibe/phases/phase-01-results/decision-record.md`.

## Goal
Implement the shortcut-based control path for toggle mute and toggle deafen. This is the sole MVP control mechanism.

## Scope
This phase implements the preferred low-maintenance control route selected in Phase 1. It must keep raw automation inside infrastructure adapters.

## Work Items
- Implement a `ShortcutController` behind the shared Discord control interface.
- Support the configured shortcut mapping for mute (`Cmd+Shift+M`) and deafen (`Cmd+Shift+D`),
  read from preferences so the user can override.
- Activate Discord, dispatch the in-app keybind, then restore the user's previous frontmost app.
- Target Discord Stable (`com.hnc.Discord`).
- Check prerequisites before dispatch:
  - Discord is running (else `unavailable`).
  - Shortcut settings are present (else `unavailable`/`failed`, actionable).
  - Required macOS permissions (Accessibility) are available (else `failed`/`unavailable`).
- Dispatch only one shortcut attempt per command invocation.
- Apply timeout handling.
- Normalize shortcut execution errors into stable reason codes.
- Log mechanism, reason code, and diagnostic details locally when diagnostic logging is enabled.

## Success Semantics (best-effort)
- **No-error dispatch → best-effort success**, with action-oriented wording ("Toggle mute sent").
  The message must NOT assert a resulting state ("You are now muted").
- **Dispatch error** (osascript/permission/timeout) → `failed` with a user-safe message.
- **Discord not running** → `unavailable`, detected before dispatch.
- `unknown` is reserved for the rare case where dispatch neither clearly succeeded nor errored.

## Implementation Rules
- Command handlers should call application use cases, not shortcut utilities directly.
- Shell or AppleScript output must not escape infrastructure code.
- Because there is no confirmation, success wording is constrained to "sent" semantics; the
  product must never imply the voice state actually changed.
- Retrying uncontrolled key events is not allowed.

## Acceptance Criteria
- Toggle Mute attempts the configured shortcut path.
- Toggle Deafen attempts the configured shortcut path.
- Each command reports best-effort "sent" success on no-error dispatch, never an asserted state.
- Discord-not-running maps to an unavailable result before shortcut dispatch.
- Missing permission maps to an actionable unavailable or failed result.
- Shortcut failures produce user-safe messages.
- Previous app focus is restored after dispatch (brief Discord flash is the accepted cost).
- Unit and mocked integration tests cover shortcut success(best-effort), unavailable, and failed outcomes.

## Deliverables
- Shortcut adapter.
- Application orchestration for the shortcut mechanism.
- Tests for shortcut result mapping.
- Manual validation notes for both toggle actions from another focused app.

## Phase Gate
Proceed when the shortcut path can be attempted safely and never reports a misleading success (i.e. never claims a confirmed state).
