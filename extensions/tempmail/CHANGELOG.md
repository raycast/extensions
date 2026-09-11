# TempMail Changelog

## [Bug Fixes & Improvements] - 2026-05-11

- Fixed images not loading in email preview — external images are now downloaded and cached locally with a fallback to the original URL
- Fixed "expires never" not properly clearing the expiry timer
- Fixed 401 token expiry silent retry targeting the wrong function — tokens now correctly re-authenticate before retrying the messages fetch
- Fixed inbox message ordering being reversed for mailboxes with more than 30 messages
- Fixed attachment filenames with multiple spaces breaking inline image rendering
- Removed `eml-parser` dependency, eliminating a chain of security vulnerabilities and reducing install size
- Added Windows support
- Updated to latest Raycast API and utilities

## [Bug Fixes] - 2026-05-11

- Fixed React hook violation that caused crashes for 694+ users when viewing emails (React errors #300/#310)
- Fixed `quoted-printable` encoding error when downloading email attachments
- Fixed token expiry errors surfacing as crashes — 401 responses now silently re-authenticate and retry

## [Bug Fixes] - 2023-11-29

- Changed Markdown translator to improve compatibility

## [Bug Fixes] - 2023-05-28

- Fixed error with emails not showing
- Allows option to view email in mail app or browser if parsing fails

## [Added TempMail] - 2023-04-10

- Initial version code