# UpNote Changelog

## [Fix Special Characters Breaking Note, Notebook and Tag Actions] - {PR_MERGE_DATE}

- Fixed Create Note, Create Notebook and View Tag failing silently when the entered title, text or tag contained an apostrophe or other special characters; x-callback-url parameters are now properly percent-encoded and the URL is opened without going through a shell.

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [Initial Version] - 2025-01-12
