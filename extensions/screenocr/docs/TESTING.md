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

## Windows native checks — pending

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

## macOS native checks — pending

- Produce the distribution build with the declared Swift/Xcode toolchain and install it in Raycast.
- Verify existing region OCR, current-display OCR and barcode/QR recognition with Screen Recording permission granted and denied.
- Cancel region capture with image-copy preference both on and off; verify stale clipboard content is not recognized.
- Test a blank image and a genuine OCR string beginning `Error:`; errors must not become text, and real text must not be rejected by its prefix.
- Test clipboard raster/file images, custom words, primary/additional languages, accuracy level, language correction, sound, line-break handling and image-copy behavior.
- Test copy, paste and copy-and-paste with focus and clipboard assertions.

## Cross-extension checks — pending on both native platforms

- Invoke `recognize-text` with callback launch options; verify recognized text, no text, cancellation and native failures all return the documented `text`/`error` shape.
- Verify ordinary result actions are skipped for callback invocations.
- Simulate callback delivery failure and verify only one callback attempt.
- Confirm existing command IDs, Store identity and saved macOS language choices are retained.

Attach a short Windows recording showing region OCR, cancellation and clipboard OCR, plus the macOS smoke-test results, before marking the PR ready for review.
