# Changelog

## 1.1.0
- Added sentence counting with proper punctuation detection
- Added paragraph counting with multi-line text support
- Improved token counting with better error handling for special tokens
- Added GPT-4o token estimation (~25% fewer tokens than GPT-4)
- Updated model labels for clarity (GPT-3.5-turbo, GPT-4, GPT-4o, Claude)
- Added compact number formatting (k/m/b) in subtitles while preserving full numbers in accessories
- Enhanced special token handling to prevent encoding errors
- Improved fallback mechanism for token counting failures

## 1.0.0
- Complete rewrite with improved UI using List view
- Added support for multiple token models (GPT-3.5, GPT-4, Claude)
- Added characters without spaces count
- Individual copy actions for each statistic
- Improved error handling and user feedback
- Better number formatting with locale support
- Added keyboard shortcuts for refresh (⌘+R)
- Added accessories to show counts in list items

## 0.1.0
- Initial release: count tokens, words, lines, and characters.