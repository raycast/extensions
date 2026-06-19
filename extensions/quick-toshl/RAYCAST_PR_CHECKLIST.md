# Raycast Extension Pull Request Checklist

Use this checklist before submitting or updating a Pull Request to the [raycast/extensions](https://github.com/raycast/extensions) repository.

## 1. 🧹 Pre-Flight & Code Quality

- [ ] **Lint & Build**: `npm run lint` & `npm run build` must pass.
- [ ] **Dependencies**: `npm-check`, no unused deps.
- [ ] **Clean Code**: No `console.log`, no commented-out code.
- [ ] **Error Handling**: Use `showToast` for errors, no unhandled exceptions.

## 2. 📝 Metadata (package.json)

- [ ] **Author & License**: Correct username, MIT license.
- [ ] **Categories**: Title Case (e.g. "Finance").
- [ ] **Command Naming**:
  - Titles: `<Verb> <Noun>`.
  - Subtitles: **Context only** (e.g. "Toshl"). **Remove** if redundant or descriptive.
  - Descriptions: One sentence.
- [ ] **Preferences**:
  - All fields have `placeholder`.
  - No separate config commands.

## 3. 🖼️ Assets

- [ ] **Icon**: 512x512px, works in Light/Dark.
- [ ] **Screenshots**: 3+, 16:10 aspect, no padding, `metadata/screenshots/`.

## 4. 📄 Documentation

- [ ] **CHANGELOG.md**:
  - Format: `## [Version] - {PR_MERGE_DATE}` (Literal string!).
  - Sections: Added/Changed/Fixed.
- [ ] **README.md**: Instructions for API keys, media in `media/`.

## 5. 🎨 UI/UX

- [ ] **Action Panel**: Title Case, `…` for submenus, consistent icons.
- [ ] **Navigation**:
  - No `navigationTitle` on Root command.
  - `navigationTitle` present on Nested screens.
- [ ] **Forms**:
  - Placeholders on ALL inputs.
  - Validation using `useForm` / `onBlur`.
- **Performance**: `isLoading` used on List/Form while fetching.
