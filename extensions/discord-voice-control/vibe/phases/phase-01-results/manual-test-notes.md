# Phase 1 Manual Test Notes

Environment:
- macOS: 26.5.1 (build 25F80)
- Node: v25.2.1
- Discord variant: Stable (`com.hnc.Discord`)
- Keybind mode: `inapp` — mute `Cmd+Shift+M`, deafen `Cmd+Shift+D`
- Date run: 2026-06-07

## Run log

### RPC IPC read — no client_id (`node spike/03-rpc-read.mjs`)
```
[RESULT] handshake-response FAIL Discord CLOSED connection: {"code":4000,"message":"Invalid Client ID"}
```
Notes: confirms a registered app is required.

### RPC IPC read — WITH registered app (`DISCORD_CLIENT_ID=… DISCORD_CLIENT_SECRET=… node spike/03-rpc-read.mjs`)
```
[RESULT] socket-discovery   PASS  Found IPC socket at .../discord-ipc-0
[RESULT] socket-connect     PASS  Connected; sending HANDSHAKE.
[RESULT] handshake-response PASS  RPC READY as 'xanitas'.
[RESULT] get-voice-direct   UNKNOWN  Not yet authorized (4006) -> AUTHORIZE flow
[RESULT] authorize          PASS  Got authorization code.
[RESULT] token-exchange     PASS  Got access_token.
[RESULT] authenticate       PASS  Authenticated.
[RESULT] get-voice-settings PASS  READ mute=false deaf=false
```
Notes: **Full ladder works.** Verified read of real voice state. The authorize popup appears
because the spike doesn't persist the token; the real extension stores it → one-time only.
**Confirmation source secured for private use.**

### UI automation inspect (`bash spike/02-ui-automation.sh inspect`)
```
[RESULT] inspect UNKNOWN  NO-HITS — no accessible mute/deafen/voice labels in front window
```
Notes: Opaque Electron web area. Fallback would require fragile coordinates → **not pursued**.

### Shortcut — toggle mute (`bash spike/01-shortcut-dispatch.sh mute`)
- Did Discord's mute state visibly flip? **YES** (user confirmed)
- Did focus return to your previous app? **YES**
- Was the Discord focus-flash acceptable? **YES**

### Shortcut — toggle deafen (`bash spike/01-shortcut-dispatch.sh deafen`)
- Did Discord's deafen state visibly flip? **YES** (user confirmed)
- Focus restored? **YES**

### No-Discord case
- Process detection works → maps to `unavailable` before dispatch. **YES**

### No-voice-context case
- **Cannot be detected** with available mechanisms. Known gap (risk R2).

## Summary verdicts
- At least one control path demonstrated mute AND deafen from outside Discord? **YES** (shortcut)
- A usable confirmation source exists? Technically yes (RPC read proven), but **dropped by choice**.
- Final decision: **shortcut-only, best-effort** (no confirmation). Messages say toggle "sent".
- **GO.** See decision-record.md. RPC spike output above retained for reference only.
