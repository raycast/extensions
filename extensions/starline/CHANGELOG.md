# Starline Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Manage StarLine car security/telematics devices via the official StarLine Open API.
- `Devices` view: list devices with live status, set a default device, run actions, and open read-only detail screens (State, Sensors, Telemetry, Position, OBD, Events, Track, Settings, …).
- No-view quick commands for the default device: `Arm`, `Disarm`, `Arm Quietly`, `Disarm Quietly`, `Start Engine`, `Stop Engine`, `Horn`, `Update Position`, with confirmation alerts for destructive operations.
- Typed wrappers for advanced commands (Hands Free, trunk disarm, panic, balance, output, DVR, Webasto, Hijack with PIN, Flex) and settings read/mutation endpoints.
- Documented SLID → SLNet authentication flow with captcha handling.
- Commands gated by each device's reported `functions` / `controls`.
- Async commands use `/v2/.../async` polling with automatic fallback to `/v1/.../set_param`.
- Auth secrets cached in memory only (TTL-scoped to the active preferences); LocalStorage stores only the user id, captcha metadata, and the chosen default device id.
