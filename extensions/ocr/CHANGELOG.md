# Extract Screenshot Text Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Capture a screen area and extract text using OpenRouter vision models
- Add guided first-time setup with OpenRouter model discovery
- Add **Change Model** command with capability-based recommended sorting
- Add **Edit OCR Instructions** as an action to customize how the AI reads screenshots
- Add OCR settings for temperature, max tokens, and provider preferences
- Move the OpenRouter API key and **Default Copy Behavior** into extension preferences
- Preserve headings, lists, and styling in OCR output
- Add primary **Copy** action plus alternate plain text and Markdown copy actions
- Show clearer provider error messages when OpenRouter returns a generic failure
- Retry capture when OCR fails or returns empty results
- Validate your OpenRouter API key when it changes in extension preferences
- Add a link in extension preferences to create an OpenRouter API key
