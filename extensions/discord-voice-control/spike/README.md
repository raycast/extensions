# Phase 1 Feasibility Spike

Throwaway proof code to answer the Phase 1 question: **can we reliably toggle AND confirm
Discord mute/deafen from outside Discord on macOS, and which mechanism wins?**

This is not extension code. It exists only to produce go/no-go evidence for
`vibe/phases/phase-01-feasibility-and-technical-decisions.md`.

## One-time setup

1. **Accessibility permission** (needed for shortcut dispatch + UI inspect):
   System Settings → Privacy & Security → **Accessibility** → enable your terminal app
   (Terminal / iTerm / the VS Code that launched this shell). Without it, `osascript`
   keystroke and UI scans fail — the scripts report that as a `FAIL` permission result.
2. Make scripts executable: `chmod +x spike/*.sh spike/*.mjs`
3. Open `spike/config.sh` and confirm the keybinds. Defaults: mute `Cmd+Shift+M`,
   deafen `Cmd+Shift+D`, mode `inapp` (you have in-app keybinds, not global).

## Run

```bash
bash spike/run-all.sh           # auto: detection + RPC read + UI inspect, then guides manual toggles
```

Or individually:

```bash
node spike/03-rpc-read.mjs                       # can we READ mute/deaf state locally? (confirmation source)
bash spike/02-ui-automation.sh inspect           # does Discord expose accessible mute/deafen controls?
bash spike/01-shortcut-dispatch.sh mute          # WATCH DISCORD: did mute flip? did focus return?
bash spike/01-shortcut-dispatch.sh deafen
# then fully quit Discord and:
bash spike/01-shortcut-dispatch.sh no-discord-check
```

## What each spike answers

| Script | Mechanism | Question it answers |
| --- | --- | --- |
| `01-shortcut-dispatch.sh` | Shortcut dispatch | Does sending the keybind flip state? Must Discord be focused? Does focus restore? |
| `02-ui-automation.sh` | UI automation fallback | Do mute/deafen controls expose stable Accessibility metadata, or only fragile coordinates? |
| `03-rpc-read.mjs` | Discord local RPC (read-only spike) | Can we connect to the IPC socket and READ mute/deaf as a confirmation source, or do we hit an auth/scope wall? |

## Recording results

Every script prints `[RESULT] mechanism=... step=... status=PASS|FAIL|UNKNOWN detail="..."`.
Paste those lines into `vibe/phases/phase-01-results/manual-test-notes.md`, then fill the
judgment columns (disruption, distribution risk) in `feasibility-matrix.md` and write the
`decision-record.md`.

## Safety / scope

- Local-only. No network calls except the local Discord IPC socket.
- RPC spike is **read-only**: no `SET_VOICE_SETTINGS`, no user token, no selfbot behavior.
- UI spike **inspects only** (no clicking) — it never reads message/server/channel content,
  only searches the control tree for mute/deafen/voice affordances.
