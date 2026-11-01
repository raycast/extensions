# Reader Mode Changelog

## [Markdown from Servers] - 2026-10-27

### Added

- Reader asks each site for a Markdown version of the page and shows it when it reads better, as on many documentation sites. Markdown that is incomplete, paywalled, or full of markup Raycast can't show is passed over for the page.

### Changed

- The Markdown version a page links to is checked the same way, instead of always replacing the page. Docs published as MDX now show the page, not raw markup, when Reader can read the page.
- Updated to the latest Raycast API.

## [Markdown Articles and Summary Models] - 2026-10-18

### Added

- Reader opens Markdown files. A link to a `.md` file used to fail with "Cannot destructure property 'firstElementChild'"; it now shows the article.
- When a page offers a Markdown version of itself, Reader reads that version instead of the page's HTML, keeping the page's title, author, and image. If the Markdown version is missing or broken, Reader falls back to the page.
- Reader reads the whole article on sites that show a teaser but ship the full text in the page's data, such as the Business Journals (bizjournals.com) sites and The Atlantic.

### Fixed

- Fewer complete articles are mistaken for paywalled ones, which sent them through a slow round of bypass attempts.
- When fetching a page from your browser fails, the "Page Found in Browser" and "Page Blocked" screens now say why, instead of staying unchanged.
- Summarizing a long article no longer runs out of memory and crashes Reader. The summary now refreshes on screen twice a second while it streams, instead of on every word.

### Changed

- Summaries now default to GPT-6 Luna, replacing GPT-5.4 nano, which Raycast has deprecated.
- Claude Haiku 5.5 replaces Claude Haiku 4.5 in the Summary Model list.
- GPT-5.6 Terra replaces GPT-5.4 mini in the Summary Model list.

## [Choose a Summary Model] - 2026-10-06

### Added

- A "Summary Model" preference to pick which Raycast AI model writes summaries, including Claude, Gemini, and Grok models. Summaries are cached per model, so switching models generates a fresh summary.
- "Regenerate" (⌘R) rewrites the current summary with the same model, and "Regenerate with Model…" (⇧⌘R) rewrites it with a different one. The summary heading names the model when it isn't the default.
- A "Strict Redaction" preference that also hides URL query strings and fragments in debug logs. Turn it on before reproducing an issue you plan to share.

### Changed

- AI summaries now use GPT-5.4 nano, replacing GPT-5 nano, which Raycast has deprecated.
- Updated to the latest Raycast API.
- "Import from Browser Tab" no longer has a keyboard shortcut; ⌘R now regenerates the summary, as in Raycast AI Chat.

### Fixed

- The Paywall Hopper could throw away a full article from an archive when the page still carried a leftover subscription meter or overlay. Those prompts are now removed before the article is checked, so the full text comes through.
- Articles that mark their body text as "subscriber-only" no longer lose that text.

## [Fix Paywall Extraction] - 2026-09-01

### Fixed

- The New Yorker and other Condé Nast sites (Wired, Vanity Fair) showed only the opening paragraph and the cartoons instead of the article. Reader was discarding the article body, which these sites tag with the same CSS class as their paywall overlay. The full article now renders.
- The Paywall Hopper could stop at the first source that returned a page — including a "subscribe to read" wall — and never try the archive services that had the real text. It now checks each source's result and keeps going until it finds the full article.

## [Fix Crashes and Improve Performance] - 2026-07-15

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
- Added an automated test suite (`npm test`) covering extraction, cleaning, and paywall detection, so this brittle logic — which broke silently in the past as sites changed — is guarded against regressions. Contributors get a runnable suite with no extra setup.

## [SF Chronicle Support] - 2026-02-27

### Added

- San Francisco Chronicle site config

### Changed

- Updated Prettier to latest version

## [Initial Version] - 2026-02-04
