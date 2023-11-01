# Gmail Changelog

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
