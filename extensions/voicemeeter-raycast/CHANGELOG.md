# Voicemeeter Control

## [Initial Release] - 2026-04-14

- Fix mute cache updates to use explicit controller state instead of parsing action messages
- Reset cached shared client promise after failed Voicemeeter connection attempts so refresh can reconnect in-session
- Fix Raycast API type errors in profile defaults and connection action shortcuts/icons
- Fix Raycast runtime warnings by relying on primary actions for Enter and removing invalid `ActionPanel` string children
- Load bundled `koffi` native bindings from `assets/native` so packaged Voicemeeter SDK access works reliably
- Change Quick Settings shortcut from Cmd+, to Cmd+; (Raycast reserves Cmd+,)
- Mute Channels: toggle, mute, and unmute Voicemeeter strips and buses
- Adjust Volume: quick step controls and absolute dB input
- Manage Connections: two-level flow with optimistic route updates (Enter on strip opens bus routes, Enter on bus toggles connection)
- Manage Profiles: global presets with per-target overrides; optional strip-to-bus connection capture
- View Status: connection status and current mute/volume snapshot
- Preferences for mute behavior, undo TTL, volume steps, and Voicemeeter executable path
