# Bluesky Changelog

## [Maintenance Release] - 2025-03-06

- in `Notifications`, fix `initialRes.body?.cancel` error (related: [Issue #14814 comment](https://github.com/raycast/extensions/issues/14814#issuecomment-2396432584)) 
- chore: update `@atproto/api` so we have better TS typing (ref: [@atproto/api v0.14.0 release notes](https://docs.bsky.app/blog/api-v0-14-0-release-notes))

## [Updated Logo] - 2025-01-10

- Update logo to use Bluesky logo from Press Kit
- Fix `Timeline` not loading when there is a blocked post (ref: [Issue #16245](https://github.com/raycast/extensions/issues/))

## [Fixes] - 2024-11-13

- Fix `Timeline` not loading due to error in `parser` (ref: [Issue #15318](https://github.com/raycast/extensions/issues/15318))
- Fix `My Recent Posts` not loading due to error in `parser` (ref: [Issue #15323](https://github.com/raycast/extensions/issues/15323))
- Add placeholders to extension `Preferences`

## [Enhancements] - 2024-10-14

- Native pagination in `Search Timeline`
- Potential fix for quoted post in timeline not having text

## [Fix `Search Timeline` Not Working] - 2024-10-01

- No more animation in Onboarding screen - it might come back in the future 👀

## [Improvements] - 2023-06-26

- The extension now requires a Bluesky App Password to be used.
- Unread Notifications command is renamed to Menu Bar Notifications.
- Menu Bar Notifications show not just the count, but the full messages of the recent 10 notifications.
- View and manage your Muted/Blocked Accounts.
- Mute or Block any user from the timeline from the Action Panel.
- Search for all posts in Bluesky.
- Improved search filters when viewing liked feed or an account feed.
- Raycast window closes automatically after a post is published (with a success HUD notification).

## [Initial Version] - 2023-04-18

Bluesky added to the Raycast Store.
