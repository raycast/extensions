# Magic Formatter Changelog

## [Fix rich formatting not reaching the clipboard] - {PR_MERGE_DATE}

- Write the rich-text (HTML) clipboard flavor directly to the macOS pasteboard. Only the plain-text flavor was landing, so destinations that render real formatting — Slack most visibly — received raw markdown and showed literal `**` and `*` markers instead of bold and italics.

## [Initial Release] - {PR_MERGE_DATE}
