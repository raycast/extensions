# TempMail Changelog

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