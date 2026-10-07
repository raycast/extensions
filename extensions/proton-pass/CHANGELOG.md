# proton-pass Changelog

## [Login Fixes] - {PR_MERGE_DATE}

- Login with Browser keeps going when Raycast closes: pass-cli runs on its own, so the login completes however long it takes in the browser. Before, Raycast could stop it once the browser came to the front, and nothing said the login hadn't completed
- While the login runs, the screen says to finish it in the browser, with Open Login Page Again and Cancel Login. Coming back to the extension picks the login up: it reloads once logged in, or says why the login didn't complete
- Get TOTP's Not Logged In screen can log in too
- Not Logged In screens have a Check Again action (⌘R), to pick up a session started elsewhere, such as a browser login that completed after Raycast had closed
- Open Terminal Login runs the same pass-cli as the rest of the extension, including the one it installed, instead of whichever `pass-cli` the shell finds, and brings Terminal to the front

## [Smoother List Scrolling] - 2026-10-05

- The item list scrolls normally again: the selection is only set when the list appears, on the suggested login, instead of on every move, which recentred the list and made it flicker

## [Password Generator Defaults] - 2026-10-05

- Generate Password has its own preferences for every default: password type and length, uppercase letters, symbols, numbers, passphrase words, separator and capitalization
- Default Password Type and Default Password Length move to the Generate Password preferences, so they're reset to their defaults once

## [Fill Logins] - 2026-10-02

- Fill Login (macOS): closes Raycast, then pastes the email (or the username when there's no email), Tab and the password into the app you were using. If the item has a 2FA code, it's left in the clipboard for the next screen
- Filling only types into the app Raycast was opened from, and stops if another app comes in front
- Paste Email, Paste Username, Paste Password and Paste 2FA Code (⌘⇧T) actions, for logins split over several screens
- Fill Login (macOS) choice for the Primary Action preference, to fill with Enter
- Fill Login preference, off by default: press Return after the password to submit the login form
- Filled values go through the clipboard as concealed, and the previous clipboard is restored afterwards, also as concealed since it can be a secret

## [Item Details Panel] - 2026-10-02

- Search Items shows a details panel next to the list, toggled with ⌘D. Every item shows the same rows in the same place: username, email, password, 2FA code with countdown, websites, note, vault, type and last modification date, with "—" for empty fields. Custom fields come last, and their copy actions also work with the panel hidden
- Notes are masked like passwords; Show Note (⌘⇧N) opens the full note
- Websites are shown as clickable tags, including saved hostnames with ports
- 2FA codes are generated locally from the item's otpauth URI, with pass-cli as a fallback for formats that can't be computed locally
- New Primary Action preference: Enter still opens View Details by default, or copies the password (notes open with Show Note, and items without a password keep View Details). View Details shows the same rows as the panel, beside the title and the full note
- New Open Website (⌘O), Copy Website URL (⌘U) and Refresh Items (⌘R) actions
- Frequently used items are ranked first
- Search also matches usernames, emails and website domains
- Logins show their initials as icon, generated locally; the new Website Icons preference shows website icons instead, from the favicon provider set in Raycast's settings (off by default, since the provider receives the domains)
- Icons in the list show which items have a note or a 2FA code; Copy TOTP Code is now Copy 2FA Code
- Items matching the active browser tab are grouped in a Suggested section. The list waits briefly for the active tab, so the suggested login is selected from the start and the selection doesn't move afterwards
- Opening a vault from List Vaults shows Search Items with that vault selected, instead of a separate, more limited list. Without cached items, that vault shows first, before the other vaults have loaded
- New Copy Title action (⌘⇧. on macOS, Ctrl+Shift+. on Windows), distinct from Copy Email on both platforms. Copy Username moves to ⌘⇧U, since ⌘⇧C copies the password
- Vaults that fail to load keep their cached items, and a toast shows the error with a Retry action
- A failed full account load also shows an error with Retry when cached or early-loaded vault items remain visible
- Item-list authentication failures clear saved metadata, including earlier per-vault caches; offline vault views can still read those earlier caches
- Failed vault loads stay retryable and do not renew the cache as a fresh empty result; an empty selected vault keeps a Retry action even when other vaults load
- Earlier per-vault snapshots fill gaps in partial shared caches and are removed after a complete Search Items or Get TOTP refresh, so deleted items do not return
- Copy Password remains available on demand when cached metadata says no password was saved; Enter still follows the Primary Action preference
- Copy Note in Show Note follows the Transient Clipboard preference, keeping notes concealed by default
- Copy Username, Copy Email and Copy Title use loaded details when available, matching the displayed values
- Loaded details also clear usernames and emails removed since the cached listing, keeping panel values and copy actions aligned
- Partial Get TOTP loads preserve saved codes for failed vaults and offer Retry
- Partial Get TOTP refreshes remove deleted codes from successful vaults before showing errors for failed vaults
- Get TOTP Retry preserves unsaved visible codes for failed vaults; overlapping loads only apply the latest result and serialize cache writes
- Expired Get TOTP codes are hidden and cannot be copied; boundary refreshes fetch codes again if the item list changes underneath them
- A slow code refresh that crosses a TOTP time step immediately retries for the new time step
- Repeated slow code responses stop with a Retry action instead of leaving refresh running indefinitely
- An ended TOTP session clears visible codes and saved metadata, including in-flight cache writes; old copy actions cannot copy removed items
- Offline vault views use the newer saved snapshot without restoring deleted items
- List selection and details stay aligned when changing vaults or filtering suggestions
- Hiding the details panel stops automatic secret loads; already-loaded custom fields and explicit copy actions remain available
- Update vulnerable transitive brace-expansion dependencies to compatible patched versions
- When the session has ended, Search Items and the vaults opened from List Vaults offer Login with Browser
- Fix: the item matching the active browser tab was never preselected, because list items had no ID
- The Transient Clipboard preference now describes what it does: copied passwords and 2FA codes are kept out of clipboard history
- Update `@raycast/utils` to 2.x
- Shorter preference texts; Background Refresh, Web Integration and Website Icons are grouped under Item List

## [Faster Loading] - 2026-10-01

- Show cached items instantly on launch, even after the cache expired, and refresh them in the background
- List vaults in parallel instead of one after another (about 8x faster with many vaults)
- Skip the separate authentication check and the duplicate vault listing before loading items
- Fix: item details always showed "Unknown Vault"
- Fix: URLs and other values in item details showed stray backslashes (e.g. `example\.com`)
- Fix: items whose ID starts with "-" could not be opened, and copying their password or TOTP code failed
- Error messages no longer include the pass-cli command line (local paths and item IDs)
- Cached items are cleared when logging in through the extension or when the session has ended, so another account's items don't show up
- Fix: a vault's item list kept showing cached items after the session ended, instead of the login screen
- Fix: a vault whose items failed to load looked empty; it now shows the error with a Retry action

## [Improvements] - 2026-09-19

- Add a Cache Expiration preference for cached vault and item metadata: 5 minutes, 1 hour, 5 hours, 1 day, 7 days, or 30 days (default: 5 minutes)

## [Windows Support] - 2026-08-30

- Add macOS and Windows x86_64 support with Proton Pass CLI 2.3.3
- Stream secure browser login URLs and use platform-native keyboard shortcuts
- Update passphrase generation for Proton Pass CLI 2.x

## [Improvements] - 2026-05-01

- Fix: Search Items command could show results from only one vault when "All Vaults" was selected (vault share_id now used as fallback during item normalization)
- Add optional background refresh preference to control cache refresh behavior
- Add optional web integration to preselect items matching the active browser tab URL
- Clarify project documentation as independent `proton-pass` implementation

## [Improvements] - 2026-02-23

- Fix: Remove macOS quarantine attribute from auto-downloaded CLI binary so it executes correctly on first use
- View Details is now the default action (Enter) when selecting an item
- All copy actions (username, email, note, URL, custom fields) now show an in-app toast instead of closing Raycast

## [Initial Release] - 2026-02-23

- Search all items across vaults
- List and browse vaults
- Copy passwords, usernames, emails, and TOTP codes
- Generate random passwords and passphrases
- View item details with custom fields
- Transient clipboard support for sensitive data
