# Proton Mail Changelog

## [Readable Emails] - 2026-10-10

- Emails are converted to clean Markdown: links show their text instead of tracking URLs, and hidden preheaders, tracking pixels, layout tables and repeated product links are dropped. Short links that follow each other share a line, and newsletter headings are shown smaller
- Plain text emails keep their line breaks and get short link labels
- The expanded view shows the subject, sender, recipients and date above the email instead of in a narrow sidebar that cut them off
- New "Remote Images" preference of Browse Email (off by default), so opening an email no longer loads tracking images
- New "Open Original in Browser" action (⌘⇧O) to see the full HTML email
- Opening an email only downloads its text, not its attachments, and recently opened emails stay in memory, so moving through the list and expanding an email are faster
- Fix out-of-memory crashes on emails with inline images
- Email bodies are no longer written to Raycast's cache on disk

## [Fix Delete and Open in Proton Mail] - 2026-10-05

- "Delete" now moves emails to Trash ("Move to Trash"). In Trash and Drafts it becomes "Delete Permanently", with a confirmation
- "Open in Proton Mail" opens the email itself instead of a subject search

## [Updated Icon] - 2026-10-05

- Update the extension icon to the current official Proton Mail logo

## [Initial Version] - 2026-01-23
