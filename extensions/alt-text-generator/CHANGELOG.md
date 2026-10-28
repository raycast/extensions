# Alt-Text Generator Changelog

## [Fix Crash on Launch] - {PR_MERGE_DATE}

- Fix every command failing with `Package subpath './_shims/auto/runtime' is not defined by "exports"` by upgrading the OpenAI SDK from v4 to v7, which no longer self-references `_shims`

## [Bug Fixes] - 2024-05-14

- Fixed issue with `From URL` command not working correctly
- Improved error handling logic for all three commands
- Improved file validation.
- Users will get more context on what went wrong when an error occurs

## [Initial Version] - 2024-05-03

Initial release of the Alt-Text Generator extension. Includes the following 3 commands:

- Generate Alt-Text from URL
- Generate Alt-Text from Clipboard
- Generate Alt-Text from File Selection
