# Proton Mail Changelog

## [Email List Fixes] - {PR_MERGE_DATE}

- Fix email order: emails are now sorted by date instead of IMAP UID, which follows the order messages reached the folder
- Emails show the time Proton received them (as in the Proton apps), the same date used to sort and page the list
- "Load More" reuses the order of the first page instead of fetching every date again
- Fix the "Has Attachment" filter showing partial or empty pages: matching emails are now found before paginating
- Fix every email showing as unread while the list loads from cache
- Show a "Read" tag in the list detail instead of an empty status

## [Fix Delete and Open in Proton Mail] - 2026-10-05

- "Delete" now moves emails to Trash ("Move to Trash"). In Trash and Drafts it becomes "Delete Permanently", with a confirmation
- "Open in Proton Mail" opens the email itself instead of a subject search

## [Updated Icon] - 2026-10-05

- Update the extension icon to the current official Proton Mail logo

## [Initial Version] - 2026-01-23
