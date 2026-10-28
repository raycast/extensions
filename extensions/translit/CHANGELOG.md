# Translit Changelog

## [Fixes & Polishes] - {PR_MERGE_DATE}

- Normalize decomposed (NFD) diacritic input to NFC so characters like `ö` are
  transliterated to `ё` instead of passing through
- Add the `shch` spelling for `щ` (`shchuka` → `щука`)
- Take the case of the hard and soft sign markers (`#`, `'`) from the
  surrounding letters, so `OB#EKT` → `ОБЪЕКТ` instead of `ОБъЕКТ`
- Show an empty output preview and hide the copy/paste actions when there is
  no input, instead of a fake `Привет...` placeholder
- Replace a fragile 2-item sort comparator for action ordering with an explicit
  partition, and derive the output in render instead of a second useState
- Remove unused `UI_TEXT.MESSAGES`, `@raycast/utils` and `react-dom`
- Migrate to `@raycast/api` 2.x with React 19 types, and ESLint 9 flat config
  via `@raycast/eslint-config` 2.x
- Add unit tests for the transliteration module (`npm test`)
- Add search keywords and declare macOS platform support
- Document the full transliteration scheme and its known collisions in the
  README
- Add a "Fix Spelling With AI" action that asks Raycast AI to correct scheme
  mistakes and typos in the transliterated text (requires Raycast Pro)

## [Added Translit] - 2025-03-31

- Initial release of the Translit extension
- Support for standard Russian phonetic transliteration rules
- Real-time conversion as you type
- Copy to clipboard action
- "Paste to Active App" functionality
- Preference option to control clearing input after action
- Dynamic action ordering based on user preferences
