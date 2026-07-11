# TODO

## 1. Refresh dependencies to the latest Raycast stack
- [X] Run `npm outdated` to capture the current status of `@raycast/api`, `@raycast/utils`, TypeScript, Prettier, `@types/*`, and other direct deps.
- [X] Install the newest Raycast API release (`npm install @raycast/api@latest` or `npx ray migrate`) so we can use current APIs and components per Raycast docs.
- [X] Bump complementary tooling packages (TypeScript, Prettier, React/Node typings) to the latest compatible versions and document any breaking changes.
- [X] Reinstall modules (`npm install`) and smoke-test `ray develop`, `ray lint`, and `ray build` to ensure the extension still compiles and runs.

## 2. Migrate ESLint tooling to v9 using the provided guide (@docs/eslint-9-upgrade-guide.md)
- [X] Update `devDependencies` to `@raycast/eslint-config` ^2.1.1, `eslint` ^9.35.0, and align TypeScript to ^5.9.2 as recommended.
- [X] Delete the legacy `.eslintrc.json` and create `eslint.config.mjs` with `defineConfig([...raycastConfig])` per the guide.
- [X] Add `eslint.config.mjs` to the `include` array in `tsconfig.json` so TypeScript is aware of the file.
- [X] Run `npm install`, then `ray lint --fix`, `npm run build`, and `npm run dev`, verifying the checklist in the guide (lint passes, build succeeds, dev command works, no Raycast console errors).

## 3. Expand the typographic character catalog
- [X] Audit `src/characters.ts` to identify coverage gaps versus references like Typewolf and W3C entity lists.
- [X] Implement the next wave of characters (examples by category):
  - Quotes: «, », ‹, ›, „ (Low Double Quote), ‟ (Double High-Reversed-9 Quote).
  - Punctuation & spacing: Interrobang (‽), inverted question/exclamation (¿, ¡), thin space ( ), hair space ( ), narrow no-break space ( ).
  - Math & symbols: Infinity (∞), summation (∑), integral (∫), proportional to (∝), approximately equal (≅).
  - Currency: Indian Rupee (₹), Korean Won (₩), Israeli Shekel (₪), Russian Ruble (₽), Swiss Franc (CHF symbol Fr/₣).
  - Miscellaneous/UI: Check mark (✓), ballot X (✗), black star (★), white star (☆), heart (♥).
- [X] Add light/dark SVG icons for quote characters; other characters rely on glyph titles/subtitles for display consistency.
- [ ] Validate the new entries inside Raycast (`DEBUG` view + manual QA) and ensure search keywords/examples are complete.

## 4. Improve data storage and UI
- [X] Migrate character data from TypeScript to YAML format for better maintainability.
- [X] Convert YAML to JSON for bundler compatibility.
- [X] Add section filter dropdown with "Show All" as default option.
- [X] Ensure all assets (SVG icons, JSON data) are properly included in the build.