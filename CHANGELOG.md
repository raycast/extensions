# Quick Share Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Added

- **Share Active Browser Tab to Slack** — send the active browser tab (URL + title) to one or more Slack channels with an optional comment
- **Send Quick Note to Slack** — send a text-only note to one or more Slack channels (no URL)
- **Edit Message Template** — customize the Slack message format via an in-extension sub-form (<kbd>⌘⇧T</kbd> from the action panel, or as a top-level Raycast command for global hotkey/alias assignment); supports `{title}`, `{url}`, `{comment}`, `{link}` placeholders; lines containing only `{comment}` are automatically stripped when the comment is empty
- **Save as Quicklink Preset** (<kbd>⌘⇧L</kbd>) — Action Panel action that creates a Raycast deeplink pre-filled with the currently selected channels, so a channel set can be pinned to a hotkey or alias for one-press posting (works with both Share Active Browser Tab and Send Quick Note)
- Multi-channel selection via tag picker, including public and private channels
- Dynamic channel list fetched from Slack `conversations.list` (cached, refreshable with <kbd>⌘R</kbd>)
- Editable title field before sending (Share Active Browser Tab to Slack)
- `launchContext: { channels: string[] }` support on both commands for pre-selecting channels from external triggers
- Per-command default channels via preferences (`Default Channels` for Share Active Browser Tab, `Quick Note Default Channels` for Send Quick Note); names or channel IDs both accepted
- Browser auto-detect — prefers the Raycast Browser Extension when connected, falls back to AppleScript (Arc, Google Chrome, Brave, Microsoft Edge, Safari)
- Slack Bot Token (`xoxb-...`) authentication with `chat:write` and `chat:write.public` support
- Inline error display in the channel picker on fetch failure, with <kbd>⌘R</kbd> retry hint
- Toast-based success/failure feedback with per-channel error reasons on partial failure
