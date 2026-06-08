# Phase 6: User Feedback And Best-Effort Messaging

> **Changed in Phase 1 (2026-06-08).** Rescoped from "Confirmation And User Feedback." The MVP has
> **no confirmation source**, so the confirmation service and state-transition machinery are
> removed. With no verification, **wording is the entire trust mechanism** — this phase hardens the
> message catalog so the product reports what it *did* (sent a toggle), never a state it cannot
> verify. See `vibe/phases/phase-01-results/decision-record.md`.

## Goal
Finalize how the extension communicates every outcome to the user under a best-effort model where
the actual voice state cannot be confirmed.

## Scope
This phase turns mechanism results into a clear, honest user experience. Its central job is to
guarantee that no message implies a voice-state change the extension cannot verify.

## Work Items
- Create message templates for every stable reason code.
- Keep success messages **action-oriented and best-effort**, such as "Toggle mute sent" or
  "Toggle deafen sent" — never state-oriented ("Muted", "Deafened").
- Keep failed and unavailable messages action-oriented, such as "Discord is not running" or
  "Accessibility permission is required".
- Use Raycast toasts or HUD feedback consistently for the no-view toggle commands.
- Ensure the status command uses the same underlying result and message vocabulary, including the
  best-effort disclaimer (sent, not confirmed).
- Provide a short, consistent way to convey the best-effort limitation without nagging on every action.

## Message Rules
- **Never say "muted" or "deafened" as a confirmed state.** The MVP cannot verify it.
- Best-effort success wording describes the action sent, e.g. "Toggle mute sent".
- Use `unavailable` when prerequisites are missing before the attempt (e.g. Discord not running).
- Use `failed` when the attempt ran and errored (e.g. permission missing, osascript error).
- Use `unknown` only for the rare ambiguous dispatch (neither clear success nor clear error).
- Keep diagnostic detail out of normal user-facing messages.

## Acceptance Criteria
- Every stable reason code has exactly one default user-facing message.
- Success messages describe the **action sent**, never an asserted resulting state.
- Failure and unavailable messages include a practical next step when possible.
- No message implies the voice state changed.
- The status command and action commands share message rules and the best-effort framing.
- Tests cover every message template and assert that no outcome (success/unknown/failed/unavailable)
  uses confirmed-state wording like "muted" or "deafened".

## Deliverables
- Message catalog (reason code → single user-facing message).
- Result-to-toast/HUD mapping.
- Tests for message safety (no confirmed-state wording anywhere).
- Updated product copy notes reflecting best-effort language.

## Phase Gate
Proceed when user feedback is consistent, concise, and never implies a voice-state change the
extension cannot verify.
