# Phone Call Changelog

## [Fix crash when launched via hotkey] - {PR_MERGE_DATE}

- Fix `TypeError: Cannot read properties of undefined (reading 'replace')` when the command is launched via a hotkey or deeplink without a typed number
- Fall back to the clipboard when no number is typed and no text is selected
- Use Raycast's built-in `open` instead of the `open` npm package, fixing an uncaught `spawn open EAGAIN` error

## [Initial Version] - 2023-08-29
