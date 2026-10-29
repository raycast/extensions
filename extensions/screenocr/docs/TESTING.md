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

## Windows development on the release app

With Raycast for Windows 2.4.0.0 and CLI 1.104.20, use:

```powershell
npm.cmd run dev -- --target release
```

The CLI defaults to the `x` target on Windows. In the tested installation this built successfully but Raycast reported "Missing executable". Selecting `release` resolved command loading. No package upgrade was needed.

## Windows PowerShell verification

Commit `a8a0cb304b3a99d9434294fde59d072660245d19` passed all 11 native tests with no failures or skips on a GitHub-hosted Windows 11 Enterprise ARM runner using Windows PowerShell 5.1.26100.9168 and the installed en-US OCR capability. The suite recognized its generated text image through the real Windows OCR engine. [Native test log](https://github.com/duckieeeduck/extensions/actions/runs/34206099847/job/101995812295).

The same commit also passed the upstream macOS distribution build, including Swift compilation. [Build log](https://github.com/raycast/extensions/actions/runs/34187718101/job/101939312183).

These results apply to that commit and those environments. They do not verify interactive Raycast behavior, mixed-DPI capture, or an x64 Windows desktop. Rerun the native suite after helper changes.

The capture-concurrency fix and its native tests were verified at test-branch commit `d55be03a031806a72d323acb874c59819403b046`: all 13 native tests passed with zero failures or skips on Windows 11 Enterprise ARM. This includes separate-process area/fullscreen contention, non-capture mode independence, abandoned-lock recovery, and real OCR. The helper and test source in PR commit `24214b96f3e8bc86bb2fdeaca32c3f376d6f8755` are identical to that tested commit. [Concurrency verification log](https://github.com/duckieeeduck/extensions/actions/runs/34315945899/job/102352074340).

The lock-lifetime correction was verified at test-branch commit `3a1a2dac91cbffa58652895e5637d9285a4264cb`: all 14 tests passed with zero failures/skips on Windows 11 Enterprise ARM and Windows PowerShell 5.1. The new regression retains the helper's main control flow and real cross-process mutex operations while substituting capture/selection and OCR functions; a separate process checks that the lock is available when recognition begins for both area and fullscreen modes. The same regression failed against the previous helper, confirming the bug. The suite also runs the existing real WinRT OCR fixture. Interactive desktop checks below remain pending. [Lock-lifetime verification log](https://github.com/duckieeeduck/extensions/actions/runs/34803139133/job/103849651011).

From `extensions/screenocr` on Windows, run:

```sh
npm run test:windows
```

This executes Windows PowerShell 5.1 against the shipped helper. It parses the helper, tests CJK spacing and resize bounds, checks the language-inventory subprocess and exact language selection, and runs WinRT OCR against a generated text image. A Latin-script OCR language pack is required. A nonzero exit or any failed test blocks validation. Report skipped cases separately; this test does not exercise the screen-selection UI or Raycast focus.

## Windows desktop verification — 19 September 2026

A user-operated Lenovo running Windows 11 Home Single Language (build 26100, reported 64-bit), Windows PowerShell 5.1.26100.7462 and Raycast 2.4.0.0 passed the following checks on one display. Node was 24.19.0 and npm 11.17.0. Exact CPU architecture and display scaling were not recorded; supplied screenshots were 1920 x 1080.

The final checkout passed **49 mocked behavior tests and 14 native Windows tests**, with zero failures/skips and both exit codes 0. [Redacted final transcript and SHA-256 hashes](validation/windows-2026-09-19.txt). The three modified source files were reconstructed from base `71e27c858a555b6060e2e7b01a3a4a358291fabc` plus the submitted patch; all three hashes matched the transcript exactly at commit `822a4d5315644c9b0ef39efe91aa14f7b2139b2b`. A subsequent CI-required formatting-only change wraps the namespace destructuring differently in `src/ocr/macos.ts`; its raw hash therefore differs without changing the calls or behavior.

The desktop findings exposed and led to these fixes:

- Windows development builds rejected named imports from the skipped Swift module. Namespace import/destructuring preserves the same macOS calls while allowing the Windows bundle to compile.
- Escape only cancelled after mouse interaction. The Windows overlay now also polls the current Escape key state while its dialog is open, then stops/disposes that timer. The deferred focus request alone did not fix the failure.
- The abandoned-lock test hung during normal process shutdown. It now deliberately terminates its lock-holder process, checks the expected exit code as an integer, and retains the acquisition and recovery assertions.

| Desktop check | Observed result |
| --- | --- |
| Language command | Lists Auto, en-GB and en-US; en-US selected for OCR tests |
| Region capture | Known lines recognized exactly; overlay closes on mouse release |
| Escape cancellation | Works before and after mouse interaction after the fix |
| Right-click and click-without-drag cancellation | Overlay closes and clipboard remains unchanged |
| Subsequent capture after cancellation | Works |
| Clipboard-image OCR | Clean two-line sample matches region OCR exactly |
| Copy, paste, copy-and-paste | Correct text, one automatic insertion at intended Notepad cursor, clipboard reusable in both mode |
| Full-screen capture on one display | Known lines recognized; Raycast search window excluded |
| Identical text near top and bottom | Both copies recognized exactly |

These are user-reported desktop observations, supported by supplied screenshots/text; no screencast was collected. The native suite uses real OCR but does not exercise the Escape timer or selection UI.

### Accuracy observations

A small 277 x 93 dark screenshot with a spelling underline produced character substitutions in "ScreenOCR"; a clean sample passed. The underline has not been established as the cause. Full-screen recognition interpreted some UI symbols as letters. No systematic bottom-of-screen accuracy loss was demonstrated. Startup delay was reported but not measured.

### Windows checks still pending

- Multiple monitors, mixed 100/125/150/200% scaling, negative desktop coordinates, portrait displays and boundary-crossing selections. A Mac with an external display does not validate this Windows helper.
- Simultaneous interactive captures, reverse-direction drags and timeout cleanup. Automated cross-process contention tests are separate evidence.
- Complete desktop language-pack removal/no-pack scenarios and multilingual fixtures.
- Clipboard format/error matrix (copied files, transparency, corrupt/unsupported/busy inputs and extremes), notifications and barcode limitation UI.
- End-to-end cross-extension callbacks and a short Windows recording.

### Dependency audit

The local npm audit reported five vulnerabilities. They remain unresolved; dependencies were not upgraded. In particular, the esbuild Windows file-serving advisory was identified. A search finding no direct serving references is not a security clearance. Review dependency updates separately from the hash-verified source patch.

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

For maintainer review, distinguish the completed single-display Windows checks from the pending items above. A Windows recording and native macOS smoke-test results remain requested evidence; do not describe this PR as fully release-validated.
