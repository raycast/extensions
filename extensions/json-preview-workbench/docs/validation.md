# Validation

Date: 2026-10-06. Host: macOS on Apple Silicon.

## Store Submission Build

- Confirmed the current Raycast account handle `tang_xiangrun` in Account settings.
- 19 automated tests, TypeScript, Raycast manifest / icon lint, all-source ESLint / Prettier, and distribution build passed. Tests cover format detection, numeric precision, object / bracket transforms, isolated runtimes, timeouts, and recovery.
- The helper includes arm64 and x86_64 slices targeting macOS 13+. `lipo -archs` and `codesign --verify --deep --strict` passed. The Intel slice was compiled but has not been exercised on physical Intel hardware.
- Imported the project into Raycast and used the validated distribution output for desktop testing. The public `examples/demo.json` fixture opened in the installed editor, with automatic formatting and a single panel. A JavaScript filter revealed a second panel and returned the expected active user's name.
- Verified the pin switch in the native window: enabling it changed the actual system window layer to 3; reopening the app preserved the enabled preference; disabling it restored layer 0. The preference was restored to off after testing.
- Ran the native Preview JSON command with the same public fixture and navigated from the root object into the `users` array, with the correct node path and entries.
- Captured `media/` screenshots from the same bundled editor UI in a browser viewport, using the public fixture. These show the editor content, not a complete native window or Raycast frame.
- Store metadata and UI labels use US English; Chinese documentation remains available separately.

## Earlier Development Checks

- Native clipboard output matched the full example JSON, and the original clipboard was restored after validation. A file exported through NSSavePanel was read back and matched the example.
- Browser and native WKWebView checks confirmed the original reference expression, YAML conversion, timeout recovery, and unsafe-number rejection.
- Computer Use of uTools 1.7.1 confirmed no-filter single panels, filtered split panels, and returning to one panel when the condition is cleared. A read-only ASAR inspection confirmed Monaco formatting options.

The original encrypted UPXS was not directly decrypted. Reading the installed ASAR does not establish byte-for-byte correspondence with that package. The tests and submission do not imply store approval or final user acceptance.
