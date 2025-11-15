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

## New feature: Screenshot input

### Implementation Steps

- [X] **Step 1: Set up Swift Tools Infrastructure**
  - [X] Add `@raycast/swift-tools` to devDependencies
  - [X] Create `swift/` directory structure
  - [X] Create `swift/Package.swift`
  - [X] Create `swift/Sources/WordCount/ScreenOCR.swift`

- [X] **Step 2: Implement Swift OCR Function**
  - [X] Create `recognizeTextFromScreenshot()` function
  - [X] Implement screenshot capture using screencapture
  - [X] Implement OCR using Vision framework
  - [X] Add error handling

- [X] **Step 3: Create TypeScript Wrapper Utility**
  - [X] Import Swift function in `src/utils.ts`
  - [X] Create `readFromScreenshot()` function
  - [X] Add error handling and toast notifications

- [X] **Step 4: Create New Command File**
  - [X] Create `src/count-screenshot.tsx`
  - [X] Implement no-view command pattern
  - [X] Format and display results in HUD

- [X] **Step 5: Register New Command**
  - [X] Update `package.json` commands array
  - [X] Add command metadata and keywords

- [X] **Step 6: Add Optional Preferences**
  - [X] Add screenshot sound preference to `package.json`

- [X] **Step 7: Update Build Configuration**
  - [X] Verify Swift compilation in build process (requires Xcode installation)
  - [X] Update `.gitignore` if needed
  - **Note:** Xcode must be installed and selected as the active developer directory for Swift compilation to work

- [ ] **Step 8: Testing & Validation** (requires Xcode installation)
  - [ ] Install Xcode from Mac App Store
  - [ ] Set Xcode as active developer directory: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
  - [ ] Build extension: `npm run build`
  - [ ] Test screenshot capture and cancellation
  - [ ] Test with various text types (English, CJK, mixed)
  - [ ] Test error handling
  - [ ] Verify HUD display formatting
  - See `docs/setup-guide.md` for detailed testing instructions

- [X] **Step 9: Documentation Updates**
  - [X] Create implementation docs in `./docs`
  - [X] Update `README.md`
  - [X] Update `CHANGELOG.md`