# Phase 1 Feasibility Matrix

Results from running the `spike/` scripts on 2026-06-07 (macOS 26.5.1, Node v25.2.1,
Discord Stable `com.hnc.Discord`, in-app keybinds `Cmd+Shift+M` / `Cmd+Shift+D`).

Status legend: ✅ works / ⚠️ partial-or-unknown / ❌ fails / — n/a

| Mechanism | Setup required | Control reliability | Confirmation reliability | User disruption | macOS permissions | Distribution risk | MVP recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Shortcut dispatch** (in-app keybind via `osascript`) | Discord in-app keybind set; Accessibility perm | ✅ Verified by user: mute + deafen flip from outside Discord | — none on its own (needs separate confirmation; none available) | ⚠️ Brief Discord focus flash, then focus restored — accepted by user | Accessibility | Low (no Discord account perms) | ✅ **PRIMARY control path** |
| **UI automation fallback** (Accessibility tree / clicks) | Accessibility perm; Discord window open | ⚠️ Opaque Electron web area: NO accessible mute/deafen labels → would need fragile coordinates | ❌ Cannot read state (no labels) | High (must focus Discord) | Accessibility | Med (breaks on any Discord UI change) | ❌ **Not pursued for MVP** (too fragile; shortcut already works) |
| **Discord local RPC (IPC)** — read only | Registered app + client_id/secret; one-time AUTHORIZE popup | not used for control | ✅ Proven to read real `mute`/`deaf`, but **dropped by choice** to avoid setup | None | None (local socket; one-time OAuth) | n/a (not used) | ❌ **Rejected by choice** (works, but too much setup; see decision-record) |

## Confirmation classification

Per acceptance criteria, classify confirmation evidence for the chosen control path:

- [ ] **Direct**
- [x] **Indirect** — dispatch returned no error; state **not** verified (RPC dropped by choice)
- [x] **Unavailable** — no confirmation implemented in MVP

Chosen confirmation source: **None (by choice).** Shortcut-only, best-effort. Messages say a toggle
was **sent**, never an asserted state. RPC confirmation works but was dropped for simplicity — the
documented path to upgrade to verified later. See decision-record.md.

## Detection notes

- Bundle ID detected: `com.hnc.Discord` (Stable). PTB/Canary: **out of scope** for MVP.
- No-Discord case detectable? **Yes** — process detection works; maps to `unavailable` before dispatch.
- No-voice-context case detectable? **No** — with RPC dropped, nothing distinguishes "in voice"
  from "not in voice." A toggle sent while not in voice still reports "sent"; message must not
  imply a state change occurred.
