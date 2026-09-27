# Magic Formatter Changelog

## [Fix rich formatting on paste, and restore paragraphs offline] - {PR_MERGE_DATE}

- Write the rich-text (HTML) clipboard flavor directly to the macOS pasteboard. Only the plain-text flavor was landing, so destinations that render real formatting — Slack most visibly — received raw markdown and showed literal `**` and `*` markers instead of bold and italics.
- Restore paragraph breaks in a wall of plain text without needing an API key. Breaks are placed on linguistic cues (greetings, sign-offs, and transitions such as "However" or "Two things") rather than on a sentence counter, and only when the text has no existing structure to preserve.

## [Initial Release] - {PR_MERGE_DATE}
