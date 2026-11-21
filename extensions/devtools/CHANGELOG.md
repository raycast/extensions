# DevTools Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Parse and edit URL components and query parameters using standard URL normalization, including duplicate keys and nested URLs with changes propagated to their parent URLs.
- Generate QR codes from URLs, choose the current or root level when editing nested URLs, and decode QR codes from the first image in the current clipboard.
- Restore the edited field's focus after returning from QR previews, nested editors, and parameter forms so keyboard shortcuts remain available.
- Convert timestamps in seconds or milliseconds with exact millisecond precision, display BCE eras, and show times in multiple saved time zones.
- Encode and decode UTF-8 text using Base64 or Base64URL.
