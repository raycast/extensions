# Phase 5: UI Automation Fallback — SKIPPED (not built for MVP)

> **Changed in Phase 1 (2026-06-08).** This phase is **not implemented for the MVP.** The Phase 1
> spike found Discord's mute/deafen controls expose **no accessible Accessibility metadata** (opaque
> Electron web area), so a UI-automation fallback would require fragile screen coordinates that
> break on any Discord UI change. Since the shortcut control path (Phase 4) already covers both
> mute and deafen, no fallback is built. See `vibe/phases/phase-01-results/decision-record.md`.

## Status
**Skipped.** The MVP ships with a single control path (shortcut dispatch) and no automated
fallback. The phase number is retained so later phases and the README index keep stable references.

## Why it was dropped
- `spike/02-ui-automation.sh inspect` returned no mute/deafen/voice labels in Discord's window.
- Coordinate-based clicking conflicts with the product's reliability and maintainability goals.
- Best-effort messaging (Phase 4) plus a clear status command (Phase 3) cover the MVP without it.

## MVP consequence
If the shortcut path regresses (e.g. the user changes Discord keybinds), there is **no automated
fallback**. The status command (Phase 3) is responsible for helping the user diagnose this.

## Deferred upgrade paths (post-MVP)
Two proven-or-plausible mechanisms are documented here as the backlog for raising the product's
capability later, if the best-effort posture proves insufficient:

1. **RPC confirmation (proven).** Discord local RPC `GET_VOICE_SETTINGS` was proven in Phase 1 to
   read real `mute`/`deaf` state for the owner's account (one-time authorize + token storage).
   This is the recommended path to restore **verified** success semantics. Spike retained at
   `spike/03-rpc-read.mjs`.
2. **UI automation (not recommended).** Only viable via fragile coordinates given the lack of
   accessible labels; revisit only if Discord later exposes stable Accessibility metadata.

## Phase Gate
N/A — skipped. Proceed directly from Phase 4 to Phase 6.
