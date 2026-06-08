# Phase 8 — Manual Validation Checklist

This is the release gate that automated tests cannot prove: real Discord behavior, macOS
permissions, focus restoration, and feedback timing. Run it with Discord Stable on macOS and record
the outcome of each row. The trust rule: **no command may imply a confirmed voice state**; success
wording must stay best-effort ("sent").

## Environment (record before testing)

| Item | Value |
| --- | --- |
| macOS version | |
| Raycast version | |
| Node / npm version | |
| Discord variant + version | Stable / |
| Extension preferences (mute / deafen / diagnostics) | |
| Accessibility permission granted for Raycast? | |

## Core scenarios

| # | Scenario | Expected | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| 1 | Toggle mute while Discord focused | Mute flips (by eye); HUD "Toggle mute sent" | | |
| 2 | Toggle mute while another app focused | Mute flips; focus returns to prior app; HUD "sent" | | |
| 3 | Toggle deafen while Discord focused | Deafen flips; HUD "Toggle deafen sent" | | |
| 4 | Toggle deafen while another app focused | Deafen flips; focus returns; HUD "sent" | | |
| 5 | Status while Discord running + in voice | Status = READY; best-effort note shown | | |
| 6 | Status while Discord running, not in voice | Status = READY (cannot detect voice context) | | |
| 7 | Status while Discord closed | Status = not running / unavailable, actionable | | |
| 8 | Toggle mute while Discord closed | Toast "Discord is not running"; no dispatch | | |
| 9 | Toggle deafen while Discord closed | Toast "Discord is not running"; no dispatch | | |
| 10 | Toggle with Accessibility revoked | Toast "Accessibility permission is required" | | |
| 11 | Toggle with shortcut pref set to garbage | Toast "No valid shortcut is configured" | | |
| 12 | Verify NO command ever says "muted"/"deafened" as a confirmed state | All wording stays "sent" | | |

## Regression scenarios

| # | Scenario | Expected | Pass/Fail | Notes |
| --- | --- | --- | --- | --- |
| R1 | Toggle mute twice | State returns to original (by eye) | | |
| R2 | Toggle deafen twice | State returns to original (by eye) | | |
| R3 | Fire a toggle rapidly several times | No uncontrolled repeated toggles beyond invocations | | |
| R4 | Switch focus between apps + toggle | Never left in an unexpected app (Discord flash only) | | |
| R5 | Revoke then restore Accessibility | Failure → success transition reported correctly | | |
| R6 | Restart Discord + Raycast, rerun status | Status reflects new state | | |

## Release readiness

- [ ] Setup guide written (README)
- [ ] Required macOS permissions documented
- [ ] Supported Discord variant documented (Stable only)
- [ ] Known limitations documented (incl. "no state confirmation")
- [ ] Troubleshooting documented for unavailable/unknown outcomes
- [ ] Command names/descriptions/icon/keywords reviewed
- [ ] Confirmed no backend / telemetry / remote storage
- [ ] Dependencies minimal and justified (`@raycast/api`, `@raycast/utils`)
- [ ] `npm run quality` passes
- [ ] Manual matrix completed

## Go / No-Go

**Decision:** _(record GO / NO-GO and date)_

**Rationale:** _(control reliable + messaging honest best-effort, or list blockers)_

## Post-MVP backlog

- RPC confirmation (proven in Phase 1) to restore verified success semantics — `spike/03-rpc-read.mjs`.
- Optional global-keybind dispatch mode (no focus flash) if users configure Discord global keybinds.
- Discord PTB/Canary targeting.
