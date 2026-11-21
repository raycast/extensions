# Secret Browser Commands Changelog

## [1.2.1] - 2026-09-15

* Fix: 1.2.0 declared `@raycast/api` 2.4.1, which is newer than released Raycast can run, so the update failed to install with "requires Raycast API v2.4.1". Back to 2.2.1

## [1.2.0] - 2026-09-15

* Feature: Browser compatibility is now verified per browser instead of assumed — every command's support list comes from reading that browser's own `chrome://chrome-urls` page, or, for the few commands no browser advertises, from navigating to them browser by browser
* Feature: Add 129 commands, including browser-specific ones for Brave, Opera, Edge, Comet, Arc, and Dia
* Feature: Commands that no longer exist stay searchable, tagged **Removed**, with a note on what replaced them
* Feature: Commands the browser lists but won't actually load are tagged **Don't Use**, and ⌘⇧H hides them
* Feature: Commands behind a Chromium feature flag are tagged **Flag** and name the flag to enable
* Feature: Windows support — search, filter, and copy any command, with Copy URL as the primary action
* Enhancement: Browsers show their real app icons, and only the ones you have installed are offered as somewhere to open a command
* Enhancement: Crash commands ask for confirmation before running
* Enhancement: Internal debugging pages say what to switch on before they will load, and are no longer hidden alongside crash commands
* Enhancement: Toggle the detail sidebar with ⌘⇧D; recheck installed browsers with ⌘R
* Enhancement: When a search finds nothing, the empty state says whether a filter is hiding matches — and how many
* Fix: Opening a `chrome-untrusted://` command failed instead of opening
* Fix: Opening a browser no longer discards its restored windows
* Fix: Stars could be lost when starring quickly, or before the extension finished loading
* Fix: Open the browser you actually have installed, not a different app that happens to share its name
* Fix: Perplexity Comet uses its own `comet://` scheme
* Chore: Drop ChatGPT Atlas, which is no longer a going concern
* Chore: `npm run build` and `npm run lint` now validate the generated command data
* Chore: Update dependencies

## [1.1.0] - 2025-10-28

* Feature: Add support for ChatGPT Atlas
* Enhancement: Update dependencies
* Enhancement: Add browser compatibility for each URL
* Enhancement: Allow selecting browser from dropdown menu to filter list of compatible URLs
* Enhancement: Add details sidebar for each path, including description, browser and platform compatibility, stability, and whether it's a debug URL
* Enhancement: Add actions to pin/unpin paths and ship with the most useful paths Starred by default
* Documentation: Expand README with compatible browsers list and Chromium source references

## [1.0.1] - 2025-07-15

* Chore: update ESLint integration

## [Initial Version] - 2025-05-26
