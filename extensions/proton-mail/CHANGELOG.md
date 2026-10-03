# Proton Mail Changelog

## [Cleaner Email Rendering] - {PR_MERGE_DATE}

- Rewrite HTML to Markdown conversion: links show their text instead of raw tracking URLs, layout tables, hidden preheaders and tracking pixels are dropped
- Plain text emails keep their line breaks and get short link labels
- Images are sized to fit the detail view, small icons are skipped
- Add a "Remote Images" preference (off by default) so opening an email no longer loads tracking images
- Add "Open Original in Browser" action to view the full HTML email
- Fix out-of-memory crashes on emails with inline images, which were embedded in the HTML as base64
- Email bodies are no longer cached to disk

## [Fix Delete and Open in Proton Mail] - 2026-10-05

- "Delete" now moves emails to Trash ("Move to Trash"). In Trash and Drafts it becomes "Delete Permanently", with a confirmation
- "Open in Proton Mail" opens the email itself instead of a subject search

## [Updated Icon] - 2026-10-05

- Update the extension icon to the current official Proton Mail logo

## [Initial Version] - 2026-01-23
