# Get App Icon Changelog

## [Sharper Grid Icons and Simpler Preferences] - {PR_MERGE_DATE}

### Added

- **Export Icon Size…** action, mirroring **Copy Icon Size…** — pick a single size and export just
  that one, without changing your preferences.
- Every failure now offers a "Copy Error" action, so a problem you hit is a problem you can report.

### Changed

- **Grid icons are now sharp.** The grid previously drew macOS's 32pt system icon scaled up to fill a
  much larger tile. It now renders real 256px icons, extracted once in the background (about a second
  for a few hundred apps) and cached until an app updates.
- **Simplified preferences.** The eight size checkboxes are replaced by a single **Default Size**
  dropdown — the per-size control now lives in the **Export Icon Size…** submenu, where it doesn't
  have to be configured up front. Format toggles and their descriptions were rewritten to stop
  repeating the option name back at you.
- Adopted [`@chrismessina/raycast-kit`](https://www.npmjs.com/package/@chrismessina/raycast-kit) for
  toast and copy helpers. The failure paths previously mutated toasts by hand, which is why none of
  them carried a Copy Error action; the shared helpers attach one by definition. Zero runtime
  dependencies, with `@raycast/api` as a peer.
- Errors that aren't `Error` objects now render a readable message instead of `[object Object]`.
- Copy shortcuts now use Raycast's standard bindings: **Copy App Path** is `⌘⌃C` (was `⌘.`) and
  **Copy App Name** is `⌘⌥C` (was `⌘⇧.`). `⌘.` is Raycast's reserved "Pin" chord.

### Fixed

- **Copying an icon now actually pastes an image.** Both **Copy Icon** and **Copy Icon Size…** put a
  reference to a temporary file on the clipboard and then deleted that file, so pasting produced the
  file path as text instead of the icon. The image data is now placed on the clipboard directly.
- **Show in Finder** no longer binds `⌘↩`, which Raycast reserves for a panel's secondary action and
  was already assigning to "Export All Sizes".
- **Show Export Folder in Finder** now opens your output folder when an app hasn't been exported yet,
  instead of failing with "Export folder not found" and leaving you nowhere.
- Exporting an app now refreshes its cached grid icon, so an app that changed its icon in place
  corrects itself the next time you export it.
- Cached icons are keyed by a hash of the app's full path. Two apps whose paths differed only in
  punctuation (`A-B.app` and `A_B.app`) previously shared one cache entry and could show each
  other's icon.
- Leaving the grid now stops icon extraction instead of letting it run on, and the progress toast is
  always dismissed rather than left on screen.

## [Initial Version] - 2026-02-16

### Added

- Initial version
