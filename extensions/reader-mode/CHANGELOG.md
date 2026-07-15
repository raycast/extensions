# Reader Mode Changelog

## [Fix Crashes and Improve Performance] - {PR_MERGE_DATE}

### Fixed

- Fixed "Request timeout after 5000ms" crashes. Commands no longer wait indefinitely on Raycast host APIs — the Browser Extension API (unavailable on Windows) is now checked with `environment.canAccess` before use, and selected-text and clipboard reads are bounded so an unresponsive host degrades to the next URL source instead of terminating the command.
- Fixed "Command terminated after reaching the extension memory limit (100 MB JS heap)" on long articles. Article parsing built three copies of the page's DOM at once; it now builds one. Peak memory on a large article drops by roughly 40%.
- Fixed ad, sidebar, navigation, and cookie-banner removal, which silently did nothing on sites that wrap their content in `<main>` or `<article>` — which is most of them. Articles now extract substantially more clean content.
- Fixed paywall detection, which only ran against a list of thirteen hardcoded domains. A paywall on any other site went unnoticed, and its subscription pitch, app icons, and email-capture form were extracted and shown as though they were the article. Detection is now based on evidence — barrier markup, gating language, and a body far shorter than the page's own description — and works on any site.
- Fixed the "Save as Markdown" and "Save as HTML" toast on Windows, which offered to reveal the file in Finder — a macOS-only API that silently did nothing.

### Changed

- Reader now shows what it is doing while loading instead of a blank screen, including which source the Paywall Hopper is trying.
- Preference labels now name the feature they control, instead of every checkbox reading "Enable", "Show", or "Skip".
- Windows: commands that depend on the Raycast browser extension now say so plainly, instead of failing as an unexplained "no URL found" or pointing at an extension that isn't available for the platform.
- Keyboard shortcuts are now explicit per platform, so Windows users get Ctrl-based bindings rather than Mac-only ones.
- Failed operations now offer a "Copy Error" action for bug reports.

## [SF Chronicle Support] - 2026-02-27

### Added

- San Francisco Chronicle site config

### Changed

- Updated Prettier to latest version

## [Initial Version] - 2026-02-04
