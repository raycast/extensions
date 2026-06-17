# WordReference Dictionary Translation Changelog

## [Windows support and storage migration] - 2026-06-16

- Add Windows support
- Migrate preferences and recent searches from legacy LocalStorage

## [Faster startup and better ranking] - 2026-06-11

- Rank translation results based on word match
- Lazy-load translation parsing to speed up command startup
- Reduce duplicate storage reads on launch

## [Better error handling] - 2026-06-02

- Prevent crashes when WordReference rejects translation detail requests
- Show a clear translation error page with probable causes and recovery suggestions
- Classify common WordReference HTTP errors such as bot protection, rate limits, missing pages, and server issues

## [Selected text and command arguments] - 2023-09-19

- Add preference to automatically use the selected text in the search bar
- Add command arguments "Word" and "Language" for a faster search

## [Initial release] - 2023-08-11

- Initial version
- Quick and easy translation feature
- Multilanguage translation support for French, Spanish, Portuguese, Italian, German, Dutch, Swedish, Icelandic, Russian, Polish, Romanian, Czech, Greek, Turkish, Chinese, Japanese, Korean, and Arabic
- Recent searches
- Preferences to select translation language
