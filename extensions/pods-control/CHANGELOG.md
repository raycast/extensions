# Pods Control Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Control AirPods and Beats listening modes (Off, Transparency, Adaptive, Noise Cancellation) and Conversation Awareness from Raycast commands, backed by the [pods-control CLI](https://github.com/raulgg/pods-control) 0.5.0 or later
- Cycle through the listening modes you select, skipping modes the connected device does not support
- Toggle Conversation Awareness
- Show the current listening mode and Conversation Awareness state in command subtitles, confirmed by macOS
- Read status with Pods Status, including background updates about once a minute
- Confirm each change with a toast, or a HUD when the Raycast window is closed
- Install, update, or repair the CLI from Raycast with the Manage CLI command, including Homebrew installation with one action
