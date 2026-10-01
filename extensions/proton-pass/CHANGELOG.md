# proton-pass Changelog

## [Item Details Panel] - {PR_MERGE_DATE}

- Search Items shows a details panel next to the list, toggled with ⌘D. Every item shows the same rows in the same place: username, email, password, 2FA code with countdown, websites, note, vault, type and last modification date, with "—" for empty fields. Custom fields come last
- Notes are masked like passwords; Show Note (⌘⇧N) opens the full note
- Websites are shown as clickable tags
- 2FA codes are generated locally from the item's otpauth URI, with pass-cli as a fallback for formats that can't be computed locally
- Enter now copies the password (or opens the note for secure notes); new Open Website (⌘O), Copy Website URL (⌘U) and Refresh Items (⌘R) actions
- Frequently used items are ranked first
- Search also matches usernames, emails and website domains
- Logins show their initials as icon, generated locally; the new Website Icons preference shows website icons instead (off by default, since it sends domains to DuckDuckGo's icon service)
- Icons in the list show which items have a note or a 2FA code; Copy TOTP Code is now Copy 2FA Code
- Items matching the active browser tab are grouped in a Suggested section
- Opening a vault from List Vaults shows Search Items with that vault selected, instead of a separate, more limited list
- Fix: the item matching the active browser tab was never preselected, because list items had no ID

## [Faster Loading] - {PR_MERGE_DATE}

- Show cached items instantly on launch, even after the cache expired, and refresh them in the background
- List vaults in parallel instead of one after another (about 8x faster with many vaults)
- Skip the separate authentication check and the duplicate vault listing before loading items
- Fix: item details always showed "Unknown Vault"
- Fix: URLs and other values in item details showed stray backslashes (e.g. `example\.com`)
- Fix: items whose ID starts with "-" could not be opened, and copying their password or TOTP code failed
- Error messages no longer include the pass-cli command line (local paths and item IDs)

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
