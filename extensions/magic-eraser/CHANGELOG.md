# Magic Eraser Changelog

## [Fix rich formatting not reaching the clipboard] - {PR_MERGE_DATE}

- Write the rich-text (HTML) clipboard flavor directly to the macOS pasteboard. Only the plain-text flavor was landing, so bold, italics, and links did not survive a paste into apps that render real formatting.

## [Initial Release] - {PR_MERGE_DATE}
