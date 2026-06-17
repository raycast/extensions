# Microsoft Teams Changelog

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