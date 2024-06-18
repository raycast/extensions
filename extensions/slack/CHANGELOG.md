# Slack Changelog

### [OAuth + Many Improvements] - 2024-06-18

- **Added OAuth Support:** Users can now log in using OAuth, making it a more secure and streamlined authentication process.
- **Improved Search Functionality:** Recently opened channels now appear at the top of search results, making it easier to find what you need quickly.
- **Enhanced Icons:** The `Set Presence` and `Set Snooze` icons have been improved, along with their performance.
- **Emojis for Unread Messages:** Emojis are now displayed when viewing unread messages.
- **Better Error Handling:** The scopes error screen has been removed in favor of failure toasts, providing clearer error messages.

## [Improvements and Fixes] - 2024-06-14

- Adds action to open in browser apart from slack app
- Only show Open in Slack option in case Slack app is installed on the system
- Fixed channelId when users are selected for unread messages

## [Performance improvements] - 2024-06-08

- Improve performance when fetching users and channels in large workspace

## [Improve Search command UX] - 2023-04-16

- Automatically close Slack right sidebar after navigating to a user chat

## [Fix] - 2022-11-01

- Fix fetching of conversations and users when hitting the Slack API limit of 1k
- Enable accessibility of channels shared via Slack Connect

## [New Command] - 2022-05-04

- Add `Unread Messages` command and update required permission scopes accordingly

## [Initial Version] - 2022-03-27

- Add `Search` command
- Add `Set Presence` command
- Add `Set Snooze` command
- Add `Open Unread Messages` command
