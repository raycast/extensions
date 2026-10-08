# Microsoft Teams Changelog

## [AI Tools and Reliability Improvements] - 2026-08-31

- Added AI tools to search people and chats, read and update presence, and set or clear status messages.
- Added AI tools for the signed-in profile, recent chats, chat messages, new-chat links, and audio or video call links.
- Added Windows support across commands, OAuth, Teams navigation, and calling.
- Replaced macOS-only call automation with Microsoft Teams deep links and added platform-native shortcuts.
- Moved AI instructions and expanded eval coverage to `ai.yaml`.
- Fixed Microsoft sign-in failing when the token response does not contain a valid access token ([#26688](https://github.com/raycast/extensions/issues/26688)).
- Fixed audio and video calls on the current Microsoft Teams app while retaining support for classic Teams ([#25929](https://github.com/raycast/extensions/issues/25929)).
- Improved extension descriptions and documented AI usage examples.

## [Update] - 2026-06-15

# Features

- Added a new Find User command to search users and open chats directly.
- Added quick actions from Find User for audio and video calls.
- Added profile tags in Find User (job title and department) when available.
- Added a Recently Contacted section in Find User.

Fixes

- Improved OAuth token handling and error messages for Microsoft app registration misconfiguration.
- Improved presence lookup handling for user and chat-style IDs.
- Added robust user search fallback logic for tenants that reject complex Graph user filters.

## [Update] - 2024-05-08

# Features

- Added ability to directly call with audio or video a user from a chat.
- Added to `OneToOne` chats status icons based on the Microsoft Graph Presence API.

## [Update] - 2023-05-16

Fixes

- No longer fail for chats without a message ([#5997](https://github.com/raycast/extensions/issues/5997))

## [Initial Version] - 2023-04-02

Initial features:

- Set presence
- Set status
- Find chat
