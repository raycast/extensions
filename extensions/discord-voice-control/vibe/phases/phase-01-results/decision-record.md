# Phase 1 Technical Decision Record

## Decision date
2026-06-08 (final)

## Context
Phase 1 evaluated three mechanisms for toggling + confirming Discord mute/deafen from outside
Discord on macOS 26.5.1 (Discord Stable). Scope is **private/personal use**.

Findings:
- **Shortcut dispatch (control): works.** User verified mute + deafen toggle from outside Discord;
  brief Discord focus flash then focus restored, accepted.
- **UI automation (fallback): too fragile.** No accessible mute/deafen labels (opaque Electron);
  only coordinate-clicking, which breaks on any UI change.
- **Discord RPC (confirmation): works but rejected by choice.** The full RPC ladder was proven to
  read real `mute`/`deaf` state (`GET_VOICE_SETTINGS`), but it requires a registered Discord app,
  a one-time OAuth authorize + token storage. The user chose to **drop RPC entirely** to keep the
  product maximally simple and zero-setup. State confirmation is therefore not implemented.

## Decision: SHORTCUT-ONLY, best-effort (no confirmation)
- **Control:** shortcut dispatch flips mute/deafen. This is the only mechanism used.
- **Confirmation:** **none.** No RPC, no UI read, no state verification.
- **Trust posture:** **best-effort.** The extension reports the toggle was **sent**, and must never
  assert a specific resulting state ("Mute toggle sent", never "You are now muted").
- Rationale: zero setup, no Discord app/OAuth, fully local, works instantly. The user explicitly
  accepted no confirmation in exchange for simplicity.

## Selected primary control path
**Decision:** Shortcut dispatch (in-app keybind via macOS automation).
**Permissions (user terms):** macOS **Accessibility** access (to send the keystroke + activate Discord).

## Selected fallback control path
**Decision:** **None.** UI automation disabled (coordinate-fragile). Shortcut covers both actions.

## Confirmation source
**Decision:** **None (by choice).**
**Classification:** indirect (dispatch-success only).
**Policy:** messages describe the action **sent**, never an asserted resulting state.

## Discord RPC determination
- [x] **Rejected for MVP by choice.** RPC confirmation was proven technically viable (read works
  for the owner's account) but intentionally dropped to avoid the Discord app registration,
  one-time OAuth authorize, and token storage. Documented as the path to restore verified
  confirmation later if the best-effort posture proves insufficient. Spike code retained in
  `spike/03-rpc-read.mjs` for reference.

## `unknown` / `failed` policy
- Dispatch succeeds (no error) → **best-effort success**: "Toggle mute sent" (no state assertion).
- Dispatch errors (osascript/permission) → `failed` with actionable message.
- Discord not running → `unavailable` (detected before dispatch).
- Missing Accessibility permission → `failed`/`unavailable` with "grant Accessibility" message.
- No valid voice context → **cannot be detected**; message must not imply a state change occurred.

## Go / No-Go
**Decision: GO** — with the trust rule relaxed to **best-effort** (verified-state confirmation
intentionally out of scope). Original phase gate ("claim success only when actual state changed")
is **not met as written**; project proceeds on the amended best-effort gate: reliable best-effort
control with honest, non-asserting messaging.

## Risk-list updates
- **R1 (trust):** No proof state changed. Mitigate with precise wording ("sent", not "now muted")
  and a best-effort note in the status command.
- **R2 (invalid context):** A toggle fired while not in voice still reports "sent" and may no-op or
  mis-toggle; cannot detect or warn beforehand.
- **R3 (no fallback):** If the shortcut path regresses (e.g. changed Discord keybinds), no
  automated fallback; status command must help diagnose.
- **R4 (deferred):** RPC confirmation remains the proven path to restore verified trust later.
