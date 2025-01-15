# Mail Changelog

## [Improvement] - 2025-01-15

- Add preference for `See Recent Mail`: `unreadonly` to show whether only unread messages.

## [Fix] - 2024-12-10

[#15571](https://github.com/raycast/extensions/issues/15571): Properly handle the timeout error for loading messages for mailboxes and increase timeout.

## [Fix] - 2024-09-03

[#14107](https://github.com/raycast/extensions/issues/14107): Increasing the timeout for getting messages from default (10 seconds) to 30 seconds as a potential fix for loading large number of mails.

## [Fix] - 2024-09-02

Fix an issue where a mailbox name containing a comma causes an incorrect mailbox name after string splitting.

## [Update README.md] - 2024-08-31

- Update README.md

## [Fixes and Improvements] - 2024-08-14

- [#13936](https://github.com/raycast/extensions/issues/13936): Fixed See Recent Messages to factor in Message Limit.
- Visual Improvements for See Recent Messages and See Important Messages commands.
- Improved error handling for See Recent Messages and See Important Messages commands.
- Message Actions: Fixed rendering order for "See Message" and "Open in Mail" actions.
- Confirmation toast instead of HUDs to better prompt users for all no-view commands.
- Upgraded the dependencies

## [Enhancement] - 2024-04-12

Add text delimiters to multiple email addresses in the mailbox caption

## [New Feature] - 2024-03-15

Add `Move to Archive` Action on Mail list

## [Fix] - 2024-01-23

Fix an issue when the `Mark all as read` Command was opening too many Mail windows

## [Enhancement] - 2024-01-21

Performance and UI feedback improvements to the `Mark all as read` Command

## [New Feature] - 2023-12-10

Add new `Mark all as read` Command

## [New Feature] - 2023-06-19

Add support for multiple languages and email services

## [Initial Version] - 2023-06-09
