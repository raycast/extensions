# Gmail Changelog

## [Maintenance] - {PR_MERGE_DATE}

- Replace all `\r\n` with `\n` in the codebase to ensure consistent line endings across all files.

## [Unread MenuBar unread fix] - 2025-03-11

- Unread menubar list now only show unread emails in your Inbox.

## [Updated image in README] - 2024-10-07

## [MenuBar Improvements] - 2024-07-30

- Add possibility to hide the menu if there are no unread mails

## [Fix] - 2023-12-27

- Fix possible crashes

## [Fix] - 2023-10-21

- Logout if OAuth token refresh fail. This enable re-login
- Catch exception if authorize fails

## [Menu] - 2023-09-16

- Unread Menu Command: Mark clicked mails as read immediately to have a more intuitive counter in the menubar
- Mark mails as read in the list view commands will update the menu commands as well
- Show Refresh action on empty list views
- Add action to copy the web URL to the clipboard from the selected mail
- Upgrade to 1.58 API

## [Labels] - 2023-08-11

- Add Labels support via actions in `List Mails`
- Add `List Archive` command
- Add `List Trash` command
- Add `List Spam` command
- `List Mails` now have a optional query parameter
- `List Mails` command can now store the current query as Quicklink
- Add actions to select multiple mails

## [Initial Version] - 2023-08-09
