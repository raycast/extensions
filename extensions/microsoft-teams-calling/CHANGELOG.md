# Microsoft Teams Changelog

## [Fix Inverted Toggle Notifications] - 2026-06-28

- Fix the microphone and camera toggle notifications showing the inverted state in New Teams. The extension now waits for the actually updated meeting state instead of the stale state Teams reports first.
- Remove the incorrect camera notification that was shown when leaving a call.
- Remove support for Classic Teams, which Microsoft has discontinued. The extension now targets New Teams only.
- Avoid a potential crash when opening Control Meeting before Teams has reported any meeting state.

## [Fix Teams API 2.0 Permissions] - 2026-04-22

- Stops Teams seeking user permission every time the extension performs an action.

## [Fix Notifications] - 2024-04-04

- Fix inverted notifications for quick actions toggle mute and toggle camera.
- Make the new teams the default selection for new users

## [Support of Teams API 2.0] - 2024-01-29

- Add support for the New Teams client. To use it, switch the Teams version in the configuration of the extension.

## [Initial Version] - 2023-03-20