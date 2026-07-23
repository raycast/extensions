# PwPush Changelog

## [Unreleased]

- Migrated to PwPush API v2 with JSON request bodies.
- Added file attachments via multipart uploads.
- Added push kind selection: Text, URL, QR Code, and File.
- Added push options: duration, views, passphrase, deletable by viewer, retrieval step, and workspace.
- Added a welcome onboarding screen.
- Added **Push History** command to browse, copy, and expire recent pushes.
- Result view now displays the generated secret link in addition to copying it to the clipboard.
- Improved server URL validation, error handling, and security.

## [Initial Version] - {PR_MERGE_DATE}

- Create secure, expiring password pushes with PwPush.
- Support for public and self-hosted PwPush instances.
- Optional API-key authentication.
- Copy the generated secret link to the clipboard automatically.
