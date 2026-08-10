# Changelog

## [1.1.0] - 2025-12-19

### Improved
- Check Text Instant now prioritizes selected text over clipboard content for better workflow integration
- Newline preservation: When LanguageTool API includes newlines in match intervals, they are now preserved in corrected text
- Smart replacement adjustment: Trailing spaces in replacements are automatically replaced with newlines when the original text ends with a newline
- Match filtering: Invalid matches (with empty or whitespace-only replacements) are filtered out before display
- Display normalization: Both original text and replacements in metadata are normalized for cleaner display (newlines removed)

### Changed
- Improved code organization and readability in text correction utilities

## [Initial Version] - 2025-12-15

- Interactive form with text checking and detailed results
- Instant clipboard check and paste (background mode)
- Support for 30+ languages with auto-detection
- Frecency-based language sorting (most used appear first)
- Persistent language preference (remembers your choice)
- Advanced options: Check Level (Default/Picky), Mother Tongue (false friends detection), Preferred Variants, Enabled/Disabled Rules, Enabled/Disabled Categories
- Automatic Premium account integration with username and API key
- Detailed results view with language, character count, and processing time metadata
- Apply corrections individually or all at once
- Keyboard shortcuts for quick actions (Apply All & Paste, Reset, Copy)
- Reset corrections functionality
- Copy and paste corrected text actions
- Comprehensive documentation with README and Advanced Options guide
- Clean architecture with separation of concerns (Components, Hooks, Services, Utils)
- Custom React hooks for text corrections state management
- Centralized API service with Premium support
- Reusable pure functions for text processing
- Full TypeScript type safety
