# Validation — 2026-10-28

Environment: macOS, installed Screenflare **0.1.24** (`app.screenflare`), local Raycast extension registered using `npm run dev`.

## Automated checks

- `npm run build`: all 16 command entry points compile and extension types generate.
- `npm run typecheck`: passes.
- `npm run lint`: Raycast manifest, icon, ESLint, and formatting validation pass.
- `SCREENFLARE_TEST_APP=/Applications/Screenflare.app npm test`: 5 tests pass. Covers all declared menu translation keys in the installed app, command entry points, broken locale handling and deduplication, permission/state error messages, and AppleScript compilation.

## Observed in Raycast and Screenflare

- **All in one** renders the three groups and all 15 actions.
- Searching **history** filters to screenshot history and recording history.
- Executing **Open Screenshot History** from the panel opens Screenflare’s **Screenshot History – 3 screenshots** window. This verifies the Raycast → AppleScript → native menu → app window path.
- Screenflare’s actual File menu exposes the corresponding capture, OCR, recording, history, and image editor items. While idle, **Stop Recording** and **Pause Recording** are disabled.
- Executing **Stop Recording** while idle displays Raycast’s **Action unavailable right now** HUD with instructions to start a recording first. It does not report success.
- Executing **Capture Fullscreen** from Raycast added a new screenshot: history increased from **3** to **4** entries. The new **3840 × 2486** image preview was inspected in Screenflare’s history; Raycast was absent from the captured image.
- The standalone **Capture Area** and **Record Display** commands were launched from Raycast and then cancelled with Escape. The automation surface did not expose a readable capture/recording overlay, so selector appearance and capture output are not counted as verified.
- Icon update: replaced the borrowed app icon with a custom generated capture-frame and flare mark. The final PNG is **512 × 512 with alpha**. Its **32 px** and **16 px** exports were visually inspected for silhouette and contrast. The high-resolution source and exact prompt are preserved under `design/`.

## Remaining manual checks

Verify screenshot clipboard/export behavior; complete one short recording and exercise pause, resume, stop, and reopen. Also exercise scrolling capture, OCR, image pasting, alternate app languages, cold app launch, missing app, and permission-denied recovery in a suitable test session. Locale resources and error classification are tested; those scenarios have not all been exercised through macOS dialogs.

The original local checks below were performed before Store submission.

Reference: [CleanShot X extension at c33bf4cb4b9ad70c2b93432ee713ffb7486ed331](https://github.com/raycast/extensions/tree/c33bf4cb4b9ad70c2b93432ee713ffb7486ed331/extensions/cleanshotx). Screenflare behavior was checked against its installed application and [official documentation](https://screenflare.app/docs).

## Raycast icon refresh and panel rename

- Reproduced the stale red template icon in Raycast while the installed PNG hash already matched the new amber icon. The image had changed under the same `extension-icon.png` path.
- Changed the asset reference to `screenflare-icon-9bd8e9e3.png` and re-registered the extension through `ray develop`. Verified the new amber frame/flare icon across the visible extension commands in Raycast’s search results.
- Renamed the existing `screenshots` command to **All in one**, preserving its command identifier. Verified that exact title in the Raycast result and updated the panel navigation title.
- `tests/icon.test.ts` failed against the original fixed icon path and passes against the content-based filename. It also checks every command for stale icon overrides; all 16 inherit the current icon.
- Type checking and all 5 tests pass. Lint has no errors; its title-case suggestion is retained as a warning because the requested label is exactly **All in one**.

## Pin actions in All in one

- Added Pin Action / Unpin Action and the ⌘⇧P shortcut. Pinned items appear once in a top Pinned section with an indicator; IDs persist in Raycast local storage.
- Live Raycast check: pinned Record or Capture, exited the panel, reopened it, and observed the restored Pinned section. Unpinning restored the original Capture group.
- Pinned Capture Area from the middle of its group; it moved to the top while remaining selected. Unpinning returned it to its original group. Test pins were removed afterward.
- The development build, TypeScript check, and all 5 existing tests pass. Lint reports only the existing requested-title capitalization warning.

## Store submission preparation — 2026-10-28

- Verified the Raycast author profile and upstream Raycast-to-GitHub mapping both identify `QIanGua`. No existing Screenflare extension or open submission was found.
- Updated to Raycast API 2.10.0 and aligned Node/React type packages with its declared versions. `npm run build` now performs the distribution build.
- Normalized the entry title to All in One for Store naming rules and removed the redundant root navigation title. Consolidated the first-release changelog.
- Distribution build, lint (without the former title-case warning), and all 5 tests passed. The optimized build opened correctly in Raycast; pin/unpin and opening Screenflare Screenshot History were exercised again.
- Captured three real Raycast views: overview, a pinned action, and history search. Exported them as 2000 × 1250 PNGs in `metadata/`, preserving aspect ratio with narrow side padding, and visually inspected each. These are UI captures, not generated mockups.
- Removed temporary pins after capture. No Screenflare media or unrelated app content is included in Store screenshots.
- Full recording/pause/resume output, OCR output, and scrolling-image stitching remain manual checks; this submission does not claim those output checks passed.
- Raycast CLI login was not completed. Submission uses the officially supported GitHub fork-and-PR route with the already authenticated GitHub account.
