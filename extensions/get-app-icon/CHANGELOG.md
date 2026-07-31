# Get App Icon Changelog

## [Versioned Export Folders] - 2026-07-31

### Added

- **Export folders now include the app's version**, e.g. `Bleep 3.4.0 App Icons`. Exporting an icon
  after an app updates previously wrote over the earlier export, because both used the same folder
  name — the old icons were gone with no warning. Each version now keeps its own folder. Re-exporting
  the same version still overwrites, which is what repairs a partial export.
- **Export Icons As…** action — pick a single format for a one-off export without changing your
  format preferences. For keeping PNG as the default but occasionally wanting just the ICNS.

### Fixed

- **The grid now notices when an app changes its icon in place.** Staleness was judged from the app
  bundle's own timestamp, but an updater that rewrites files *inside* the bundle leaves that
  timestamp untouched — an updated app kept showing its old icon indefinitely. The check now also
  looks at `Contents`, `Info.plist`, and `Resources`, which do move.
- **Show Export Folder in Finder** finds exports made before folders were versioned, instead of
  treating them as missing.
- A failed export no longer leaves empty folders behind. Exporting ICNS for an app that uses Asset
  Catalog icons created the folders before discovering there was nothing to put in them, leaving an
  empty `ICNS/` — or an empty app folder — sitting in your output directory. Cleanup now only ever
  removes a folder the export itself created, so a folder you made is left alone even when empty.
- **Grid icons now update when an app changes its icon.** Roughly half of installed apps name their
  icon file something other than the conventional `AppIcon.icns` — Visual Studio Code's is
  `Code.icns` — and a changed icon in one of those apps was invisible to the cache, so the grid
  could show a stale tile indefinitely. The declared icon file is now checked directly.
- **Every export now offers "Reveal in Finder" (`⌘O`) on its success toast.** The action was
  attached but carried no keyboard shortcut, so nothing on screen indicated it existed and an
  export appeared to leave you with nowhere to go. Covers **Export Icons**, **Export Icon Size…**,
  **Export Icons As…**, and **Export All Sizes**.
- The grid no longer re-extracts icons it has already cached when part of an app bundle can't be
  read, and no longer keeps showing an out-of-date icon once it can be read again.
- Two releases whose version strings are identical for the first ~240 characters now still get
  separate export folders, instead of the second overwriting the first.

## [Sharper Grid Icons and Simpler Preferences] - 2026-07-27

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
