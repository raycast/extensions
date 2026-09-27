# Changelog

## [Initial release] - {PR_MERGE_DATE}

- Add Mistral API models to Raycast's native AI model picker.
- Store the API key in a password preference.
- List latest chat models with unique display names, excluding Codestral and Voxtral.
- Support streaming, images, and tools according to model capabilities.
- Retry temporary failures before output starts and continue interrupted text answers within fixed limits.
- Stop recovery after tool-call streaming starts, on explicit provider stops, or on cancellation.
