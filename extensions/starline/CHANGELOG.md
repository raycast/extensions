# Starline Changelog

## [Productization] - {PR_MERGE_DATE}

- Added full product API coverage for StarLine user/device library endpoints: user devices, device list, mobile devices, event library, LBS position, and data transfer settings.
- Added typed wrappers for advanced StarLine commands including Hands Free, trunk disarm, panic, balance, output, DVR, Webasto, Hijack with PIN, and Flex commands.
- Added Raycast account/device screens and safe forms for newly exposed API capabilities.
- Replaced ad-hoc `Set-Cookie` parsing with `Headers.raw()` lookup that handles multi-cookie responses.
- Deduplicated devices that appear in both `devices` and `shared_devices` collections.
- Unified status labels (`Armed/Disarmed`, `Enabled/Disabled`, `Open/Closed`, …) across list, detail, and API screens in English.
- Added `Last 1h / 6h / 24h / 7d` history period actions to Events and Track detail screens.
- Removed unused `getDisplayableErrorMessage` helper; tightened `Item.default` typing.

## [1.1.0]

- Split the monolithic API client into `client` / `commands` / `devices` / `settings` layers and added typed wrappers for state, position, OBD, events, ways, driving score, comfort options, and settings endpoints.
- Async command support with `/v2/.../async` polling and automatic fallback to `/v1/.../set_param`.
- New no-view commands: `Arm Quietly`, `Disarm Quietly`, `Horn`, `Update Position`.
- Per-device action panel: primary commands, advanced commands, raw command set, and read-only detail views (State, Position, Info, Data, Report, Settings, Comfort Options, Events, Track, Driving Score, OBD).
- Confirmation alerts for destructive operations (`Disarm`, `Disarm Quietly`, `Disarm Trunk`, `Stop Engine`, `Start Engine`, `Panic`, JSON mutation forms).
- Dynamic gating of commands by device `functions` / `controls` from `user_info`.
- Captcha flow: `Submit Captcha` actually calls `loginWithCaptcha` and reloads devices.
- In-memory auth secret cache with TTLs scoped to the active preferences hash; LocalStorage only stores captcha metadata, user id, and default device id.
- `Clear Auth Cache` action.
- Development-only raw JSON mutation forms for advanced settings.
- Jest test suite covering auth scoping, async-command fallback, captcha flow, device list deduplication, action panel rendering, and command confirmation.

## [Initial Version] - 2024-01-16
