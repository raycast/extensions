# Text Counter Changelog

## [CJK support, accurate tokenizers, selected text, and cost estimates] - {PR_MERGE_DATE}

- **Fixed word counting for CJK text**: Chinese, Japanese, and Korean characters are now counted as words (previously any text without spaces counted as 1 word)
- **Fixed sentence counting for CJK punctuation**: sentences ending with 。！？… are now recognized
- **Accurate GPT-4o token counts**: now uses the real `o200k_base` encoding instead of a scaled estimate
- **Honest Claude token labeling**: marked as an estimate since Claude 3+ tokenizers are not public
- **Selected text support**: reads the selected text in the frontmost app first, falling back to the clipboard (configurable)
- **Analyzed text preview**: the list now shows a preview of the text being counted and its source
- **Reading time estimate**: based on ~200 words/min (space-delimited scripts) and ~300 chars/min (CJK)
- **Grapheme-accurate character counts**: emoji and combined characters count as 1 character
- **Context window usage**: each token row shows the percentage of the model's context window used
- **Cost estimates**: input cost per model using live pricing from [models.dev](https://models.dev), cached for 24h
- **Copy All in multiple formats**: plain text, Markdown table, or JSON
- **Preferences**: toggle token counts, reading time, cost estimates, and the selected-text source
- Added unit tests for all counting logic

## [Sentences, paragraphs, and better tokens] - 2025-08-20

- Added sentence counting with proper punctuation detection
- Added paragraph counting with multi-line text support
- Improved token counting with better error handling for special tokens
- Added GPT-4o token estimation
- Updated model labels for clarity (GPT-3.5-turbo, GPT-4, GPT-4o, Claude)
- Added compact number formatting (k/m/b) in subtitles while preserving full numbers in accessories

## [List view rewrite] - 2025-08-20

- Complete rewrite with improved UI using List view
- Added support for multiple token models (GPT-3.5, GPT-4, Claude)
- Added characters without spaces count
- Individual copy actions for each statistic
- Improved error handling and user feedback
- Better number formatting with locale support
- Added keyboard shortcuts for refresh (⌘+R)

## [Initial Version] - 2025-08-20

- Initial release: count tokens, words, lines, and characters
