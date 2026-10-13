# Text Counter Changelog

## [Initial Release] - 2026-10-13

- **Fixed word counting for CJK text**: Chinese, Japanese, and Korean characters are now counted as words (previously any text without spaces counted as 1 word)
- **Fixed sentence counting for CJK punctuation**: sentences ending with 。！？… are now recognized
- **Accurate GPT-4o token counts**: now uses the real `o200k_base` encoding instead of a scaled estimate
- **Honest Claude token labeling**: marked as an estimate since Claude 3+ tokenizers are not public
- **Selected text support**: reads the selected text in the frontmost app first, falling back to the clipboard (configurable)
- **Analyzed text preview**: the list now shows a preview of the text being counted and its source
- **Reading time estimate**: based on ~200 words/min (space-delimited scripts) and ~300 chars/min (CJK)
- **Grapheme-accurate character counts**: emoji and combined characters count as 1 character
- **Context window usage**: named models show their context usage; the generic `cl100k_base` encoding does not claim a single context size
- **Cost estimates**: input cost per model using live pricing from [models.dev](https://models.dev), cached for 24h
- **Copy All in multiple formats**: plain text, Markdown table, or JSON
- **Preferences**: toggle token counts, reading time, cost estimates, and the selected-text source
- Added unit tests for all counting logic
