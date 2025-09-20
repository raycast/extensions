# Slack Changelog

## [Fix Send Message Missing Scope Error] - 2025-08-25
- Add missing `chat:write` scope to fix “missing_scope” error when using the **Send Message** command.

## [Channel, Channel History bug fixes and "Search Message" to Tools] - 2025-07-10
- Added the `search.message` slack api to enable AI to use the tool (search for full messages)
- Fixed failure to find channelId when using get-channel-history with AI
- Fixed issue that prevented importing all slack channels

## [Fix YAML manifest errors in README] - 2025-06-25

## [Fix search messages from specific user] - 2025-06-23

- Fix search messages from specific user (using `from:<@${user.id}>` instead of `from:${user.name}`)

## [Fix Emoji Search Missing Scope Error] - 2025-05-28

- Add missing `emoji:read` scope to fix "missing_scope" error when using Search Emojis command

## [AI-Powered Emoji Search] - 2025-04-24

- Enhanced the `Search Emojis` command with AI-powered search: If you can't find an emoji by name, describe what you're looking for and AI will suggest the most relevant Slack emojis.

## [New Emoji Features and Improvements] - 2025-04-12

- Add new `Search Emojis` command to browse and copy Slack emojis
- Add `get-emojis` tool to fetch emojis with AI
- Improve getting channel history with AI
- Update tool titles and improve overall functionality

## [New "Send Message" command] - 2025-04-10

- Add a new command to send a message to a channel or user in Slack. Can send the message immediately or schedule it to arrive at a certain date or time. In order for this to work, you will need to add `chat:write` scope to the manifest, and re-install the application in your Slack space.
- Updated README with updated scopes instructions.

## [Moved contributor] - 2025-03-31

## [Update README with improved manifest.yaml] - 2025-03-05

## [Added new scope] - 2025-02-26

## [✨ AI Enhancements] - 2025-02-21

## [New "Copy Message URL" action] - 2025-02-10

- Add `Copy Message URL` action to copy the URL of a message to the clipboard from the `Search Messages` command

## [New "Copy Huddle Link" action] - 2025-01-13

- Add `Copy Huddle Link` action to copy the huddle link of a chat to the clipboard

## [Adds Optional Metadata to Open Channel Command] - 2024-07-30

- Now includes job title, timezone, current time, and Slack status in the list returned by the Open Channel command.
- Adds user preferences to display this new metadata.

## [Search Messages command] - 2024-07-08

- Add a new command to search through your Slack's workspace messages.
- ⚠️ The previous `Search` command is renamed as `Open Channel` to differentiate from `Search Messages`
- Add `Save as Quicklink` action in `Open Channel` command

## [OAuth + Many Improvements] - 2024-06-18

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
