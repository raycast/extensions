# Bopomofo Search Changelog

## [Fix Pinyin Conversion Algorithm] - 2026-03-04

- Fix full-string conversion for `jun/qun/xun` and `juan/quan/xuan`.
- Add special handling so `un`/`uan` after `j`, `q`, or `x` map to `ㄩㄣ`/`ㄩㄢ`.
- Allow spaces to separate multiple pinyin syllables in the input for separating output.
- Add extension metadata screenshots for the Raycast Store listing.
- Better compliance with Raycast's extension guidelines.

## [Add Pinyin Conversion Command] - 2026-03-03

- Add `Pinyin to Bopomofo` command for translating full pinyin strings.
- Add translation dataset at `assets/pinyin-translation.json`.
- Add longest-match pinyin parser in `src/translate.ts` for continuous input conversion.

## [Add Primary Action Preference] - 2026-03-03

- Add configurable `Primary Action` extension preference to choose between copy and paste.
- Add paste action that inserts Bopomofo directly into the active application.
- Add context-aware paste action title and icon using the current frontmost app.
- Add numeric tone mark input support (`1` to `5`) in translation mapping.
- Update command action panel to support both copy and paste workflows.

## [Initial Release] - 2026-03-03

- Add initial Raycast command `Bopomofo Search`.
- Add pinyin-to-Bopomofo dataset at `assets/bopomofo-dataset.json`.
- Add grid-based search UI with instant filtering and copy-to-clipboard action.
- Add SVG icon generation for each symbol with light/dark variants.
- Add cross-platform SVG text rendering handling for macOS and Windows.
