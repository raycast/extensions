# Link Cleaner Changelog

## [Expand Rules, Add AI Fallback, and Manual Review Mode] - 2026-03-20

- Expand site-specific rules from 6 to 30+ sites (search engines, video, music, social media, e-commerce, developer platforms)
- Add Raycast AI fallback for URLs not matching any predefined rule (requires Pro; degrades gracefully to a built-in blacklist
  of 80+ common tracking parameters)
- Add "Manual Review" preference — when enabled, shows a Form with TagPicker so users can review and select which parameters to
  keep before cleaning
- Unify all notifications to `showToast` (previously mixed `showHUD` and `showToast`)
- Remove redundant/dead code (`main.ts`, duplicate `rules.ts`, `try-catch.ts`)

## [Add options to close Raycast after cleaning] - 2025-09-09

## [Added Clean Selected Text Functionality] - 2025-04-15

- Add new command `clean-selected-text.ts`
- Update `package.json` to include new command and update dependencies
- Rename `main.ts` to `clean-clipboard-text.ts`
- Separate utility functions into their own files: `utils/*.ts`
- Add `try-catch.ts` to handle errors
- Update ESLint configuration from `.eslintrc.json` to `eslint.config.mjs`
- Update `README.md`

## [Add `Instagram Reel` rule] - 2024-10-14

## [New Additions] - 2023-12-08

- Add youtube rule in `src/rules.ts`

## [Added Link Cleaner] - 2022-08-31

- The script can exclude the trace parameters from the text now.
- Rules templates of some search engines are provided.
