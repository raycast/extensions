# ScreenOCR verification

Record the tested commit, Raycast version, OS version, architecture and display configuration with native test results. A passing TypeScript test does not establish that capture, OCR, focus or Swift packaging works on a desktop.

## Automated checks

Run from `extensions/screenocr`:

```sh
npm ci
npm test
npm run lint
npm run build
```

`npm test` exercises the TypeScript commands, protocol handling, clipboard actions and callbacks against mocked Raycast and native hosts. It does not execute the PowerShell helper or compile Swift.

`ray lint --relaxed` can run the same source lint and formatting checks when Raycast's remote manifest/account validators are unavailable. It does not replace the complete manifest, icon or metadata checks.

The existing Swift integration requires macOS and Xcode for `ray build` production compilation. Raycast CLI 1.104.20 skips Swift compilation during Windows development builds; a conditional runtime import does not remove the macOS production-build requirement.

## Windows PowerShell verification — pending execution

From `extensions/screenocr` on Windows, run:

```sh
npm run test:windows
```

This executes Windows PowerShell 5.1 against the shipped helper. It parses the helper, tests CJK spacing and resize bounds, checks the language-inventory subprocess and exact language selection, and runs WinRT OCR against a generated text image. A Latin-script OCR language pack is required. A nonzero exit or any failed test blocks validation. Report skipped cases separately; this test does not exercise the screen-selection UI or Raycast focus.

## Windows desktop checks — pending

- Install and run the built extension in Raycast using the Windows PowerShell 5.1 helper.
- Verify region, all-monitor and clipboard OCR against known text; confirm no Raycast window is included in the capture.
- Test Escape, right-click, clicks without a drag, reverse-direction drags, repeated launches and process timeout. Confirm the overlay and helper exit and the previous clipboard survives cancellation.
- Test displays left of and above the primary display, portrait displays, and mixed 100%, 125%, 150% and 200% scaling. Compare the selected physical pixels to the visible rectangle.
- Test copy, paste and copy-and-paste into an ordinary editor. Verify that focus returns to the intended app and the clipboard behavior matches the preference.
- Test Auto, an installed explicit language, a removed explicit OCR pack, no OCR packs, and an installed language absent from profile preferences. Confirm there is no silent explicit-language fallback.
- Test Chinese/Japanese text, Korean word spacing, mixed-script text, fullwidth numbers, blank images and line-break removal.
- Test clipboard images, copied PNG/JPEG/BMP/GIF/TIFF files, transparent images, unsupported WebP, corrupt files, busy clipboard access, tiny images and extreme aspect ratios. Confirm file handles are released.
- Test both enabled and disabled notifications; confirm barcode invocation reports its macOS limitation without invoking Swift.
- Do not claim ARM64 support without testing the corresponding host and process architecture.

## macOS compatibility checks — pending on device

The Swift source is identical to upstream commit `4729145871e638f806082b1f9e4fb791fba5a8bc`. Existing macOS command bodies and native string handling are retained behind platform routing. This contribution does not fix existing macOS error/cancellation behavior or add macOS clipboard OCR.

- Produce the distribution build with the declared Swift/Xcode toolchain and install it in Raycast.
- Smoke-test the existing region OCR, current-display OCR, barcode/QR recognition and recognition-language command.
- Confirm existing copy behavior, custom words, languages, accuracy, correction, sound and image-copy preferences are retained.
- Confirm Windows result-action preferences do not change macOS output behavior.

## Cross-extension checks — pending on devices

- On Windows, invoke `recognize-text` with callback launch options; verify recognized text, no text, cancellation and failures return the documented `text`/`error` shape without ordinary copy/paste actions.
- Simulate Windows callback delivery failure and verify only one callback attempt.
- On macOS, confirm the existing callback behavior is preserved; this Windows contribution does not change its implementation semantics.
- Confirm existing command IDs, Store identity and saved macOS language choices are retained.

Attach a short Windows recording showing region OCR, cancellation and clipboard OCR, plus the macOS smoke-test results, before marking the PR ready for review.
