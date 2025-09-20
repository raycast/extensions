# Messages Changelog

## [Start New Chat on No Results] - 2025-07-09

When a search in Open Chats returns no matching chats and the input consists solely of valid phone-number characters, display a "Start New Chat" action to open the Messages app with the entered number. 

## [Support for Hyphenated OTP Codes] - 2025-07-09

Added detection for OTP codes formatted with hyphens (e.g. 123-456), requiring at least 3 digits on both sides.

## [Docs: Add note about automation permissions] - 2025-07-01

Added a note about automation permissions for Raycast in the README.md file.

## [Fix OTP Code Parsing for Messages with colons in the message body] - 2025-05-30

Fixed an issue where OTP codes with colons in the message body were not being parsed correctly.

## [Fix OTP Code Parsing for Messages with Special Characters] - 2025-05-08

Fixed issues with wrong number being parsed by adding additional common characters the regex and adding a bit more logic to select the largest OTP from the filtered list.

## [Added Keyword] - 2025-02-26

Added a "2FA" keyword for improved discovery

## [✨ AI Enhancements] - 2025-02-21

## [Fix `Paste Latest OTP Code` Command for Phone numbers] - 2025-02-10

Added a number filter for OTP Code messages that include phone/cellular numbers that should not be used as OTP Codes for this command.

## [Direct link to System Settings] - 2025-01-19

Added a direct link to System Settings when full disk access is required for the `Paste Latest OTP Code` command.

## [Add `Paste Latest OTP Code` command] - 2024-10-11

Automatically finds and pastes the most recent one-time password (OTP) from your messages.

## [Fix heap memory errors] - 2024-10-09

Fixes a crash issue that could occur when the user has too many contacts.

## [Big Update] - 2024-10-08

This big update brings you new commands and a lot of useful improvements to the extension.

- **New `My Latest Messages` command**: Check in on your latest messages. Play audio messages, or open images & videos from there. Reply to these messages by yourself or using AI.
- **New `Open Chat` command**: Quickly open your most recent chats in the Messages app. Go even faster by creating quicklinks to these recent chats.
- **New `Unread Messages` command**: Display your unread messages in the menu bar to stay on top of them.
- **Rework `Send Messages` command**: It uses your latest chats instead of your contacts. This now makes it possible to send SMS messages to your contacts.

## [Close the Messages app] - 2024-08-12

- Closing the Messages app if it wasn't open before to keep your dock clean.

## [Quicklinks and permissions] - 2024-07-16

- **Messages Quicklinks:** Users can now create address quicklinks directly in the Messages app.
- **Permission Request:** The extension will now ask for permission to access your contacts. If permission is denied, a clear error message will be displayed.

## [Close Raycast when sending a message] - 2024-07-03

- Added a preference allowing users to close Raycast when sending a message.
- Fixed an issue where "empty" contacts were appearing in the contact list dropdown.

## [New address field] - 2024-3-28

There is now an `Address` field in the `Send Message` command, allowing you to choose the address to which you want to send the message.

## [Added metadata image] - 2024-03-13

## [Initial Version] - 2023-12-22
