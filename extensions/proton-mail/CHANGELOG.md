# Proton Mail Changelog

## [Email List Fixes] - {PR_MERGE_DATE}

- Fix email order: emails are now sorted by date instead of IMAP UID, which follows the order messages reached the folder
- Fix the "Has Attachment" filter showing partial or empty pages: matching emails are now found before paginating
- Fix every email showing as unread while the list loads from cache
- Show a "Read" tag in the list detail instead of an empty status

## [Initial Version] - 2026-01-23