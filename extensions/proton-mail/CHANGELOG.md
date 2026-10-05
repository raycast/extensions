# Proton Mail Changelog

## [Cleaner Email Rendering] - {PR_MERGE_DATE}

- Rewrite HTML to Markdown conversion: links show their text instead of raw tracking URLs, layout tables, hidden preheaders and tracking pixels are dropped
- Plain text emails keep their line breaks and get short link labels
- Images are sized to fit the detail view, small icons are skipped
- Add a "Remote Images" preference (off by default) so opening an email no longer loads tracking images
- Add "Open Original in Browser" action to view the full HTML email
- Product cards no longer repeat their title when images are hidden, and long image descriptions are not used as link labels
- Fix out-of-memory crashes on emails with inline images, which were embedded in the HTML as base64
- Email bodies are no longer cached to disk

## [Initial Version] - 2026-01-23