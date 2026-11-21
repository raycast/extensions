# proton-pass Changelog

## [Copy Closes Raycast] - 2026-11-20

- Copying from an item closes Raycast and shows "Password Copied", or the name of what was copied, at the bottom of the screen, like Raycast's own Copy actions, instead of staying open. Raycast stays open while the item loads, and when there's nothing to copy or the copy fails, to show why. Get TOTP Code's Copy TOTP Code, Generate Password's Copy Password and Copy Item Debug Info do the same. Copy and Generate Next keeps Raycast open for the next password
- Paste Password has a shortcut, ⌘⇧P on macOS. It pastes the password into the app you were using and leaves the item's TOTP code in the clipboard, ready to paste with ⌘V

## [Going Back Keeps the Order] - 2026-11-20

- An order chosen with Sort by or Sort Folders by in an opened folder also shows when going back: the list underneath follows it, instead of keeping its own

## [Sort Folders] - 2026-11-19

- Browse Items has a new setting, Sort folders by, for the folders of an opened vault or folder and the subfolders in a selected folder's side panel: by name (the default, as until now), by item count, the folders holding the most items first, their subfolders' included, or by most used, the folders opened most from Raycast first. Folders that come out alike are by name
- Sort Folders by (⌘⇧S) on a folder changes their order until the window closes, as Sort by does for items and vaults

## [CLI Path Screens over Saved Items] - 2026-11-19

- The vault list shows the Proton Pass CLI Not Found, Out of Date and Can't Run screens when it has saved vaults too, as the item list does. It used to show the saved vaults without explaining why they didn't refresh
- With Background Refresh off and saved items still fresh, both lists show these screens too, instead of saved items whose passwords can't load

## [Your Mac's Proton Pass CLI] - 2026-11-19

- With CLI Path left as pass-cli, the extension uses the Proton Pass CLI installed on your Mac, e.g. with Homebrew, when it's version 2.5.1 or later, instead of downloading its own. Raycast and the terminal then run the same pass-cli, so macOS doesn't ask for keychain access each time you switch between them
- If the extension already runs the copy it downloaded, it keeps it until you log out with the Login command, which removes the session's key from the keychain: switching while logged in would make macOS ask for keychain access again. Clear CLI Cache downloads the copy again, as before
- A pass-cli at CLI Path older than 2.5.1 gets a Proton Pass CLI Out of Date screen with its version and Open Extension Preferences, instead of failing without explanation, e.g. on folders. One that doesn't say its version, such as a script, still runs
- A CLI Path that's a folder, or a file that can't run, gets a Proton Pass CLI Can't Run screen instead of a system error. Proton Pass CLI Not Found says what's wrong in fewer words
- pass-cli is looked for in Raycast's PATH first, then in the folders where it's usually installed, and only a file you can run is taken
- The README's Homebrew command uses Proton's current tap, `protonpass/tap/pass-cli`: the old one no longer exists

## [More Choices for Enter] - 2026-11-18

- Primary Action has four more choices: Paste Password, Copy TOTP Code, Paste TOTP Code and Open Website. An item without what the choice needs opens its details, as with Copy Password, and a note shows its note. On Windows, where Raycast can't paste, Paste Password and Paste TOTP Code copy instead, as Fill Login copies the password. The choices follow the order of the actions, and their description says which are for macOS instead of a "(macOS)" in their names. Saved choices are kept
- Enter's action stands alone at the top of the actions (⌘K), set apart from the Copy actions below it
- Fill Login heads the Paste section, above Paste Email, unless it's Enter's action. With Primary Action set to Copy Password, ⌘↵ no longer fills the login, as Fill Login was second in the menu

## [Passwords Copied as Saved] - 2026-11-18

- Passwords and other secrets are copied and filled exactly as saved. Spaces at their start or end were dropped, so a password such as " secret " no longer worked once pasted. This covers a login's password, a Wi-Fi password, hidden and TOTP custom fields, a card's number, security code and PIN, an identity's ID numbers and an SSH private key

## [Details for Every Item Type] - 2026-11-18

- The item details show what each type of item holds, instead of a login's rows left empty. A card shows its cardholder name, number, expiration date (as on the card, 12/27), security code and PIN; an identity its full name, email, phone number and address on one line, then its other fields that are filled; an alias its address; an SSH key its public and private keys; a Wi-Fi network its name, password and security. A note shows its note first. The rows of a type stay the same from one item to the next, with a dash when empty. Website now shows on logins only
- Secrets are masked: a card's number, which shows its last 4 digits only, security code and PIN, an identity's social security, passport and license numbers, an SSH private key and a Wi-Fi password
- Each filled field has a Copy action, the main one on ⌘C: a card's number, an alias's address and a Wi-Fi network's password. Secrets are copied out of clipboard history with Transient Clipboard, as passwords are
- In a folder's side panel, every item shows what tells it apart next to its name, instead of its type, which its icon gives: a card its last 4 digits, an alias its address, a Wi-Fi network its name, an identity its full name, as a login its username or email. Notes, SSH keys and custom items show their icon only. These are kept with the item list, never a card's number or any other secret
- Aliases showed as notes, since pass-cli prints nothing in an alias's content: they show as aliases, with their address
- Custom items show their fields, by section, instead of being taken for notes
- Custom fields didn't show: pass-cli 2.5 prints them in a form the extension didn't read. They show last in the details, by section, an identity's extra details under their group: text as it is, hidden fields masked, dates as dates, and TOTP fields masked, their Copy action giving the current code
- Copy Item Debug Info lists which fields an item has filled, never their values
- The CLI Path preference's description is shorter, so that Raycast's settings show it whole instead of folding it behind Show more
- Generate Password's settings are one list, without the small "Characters" and "Options" headings, which every row's "Random:" or "Passphrase:" prefix made redundant. "Characters" also set Random: Length apart from its checkboxes. Saved settings are kept

## [Clearer Fill Messages] - 2026-11-17

- When macOS doesn't let Raycast fill, Fill Login and the Paste actions open the place in System Settings where Raycast lacks a permission: Accessibility, named Device Control and Data Access in recent macOS versions, or Automation, to control System Events. Their message says to allow Raycast there, and fits on screen. It used to name both permissions, was cut short, and gave no way to get there
- When filling stops because another app is in front, its message names the app macOS sees in front instead of the app to fill, and cuts a long name so that the message fits on screen

## [Clearer Generate Password Preferences] - 2026-11-17

- Every Generate Password checkbox says whether it's for random passwords or passphrases, e.g. "Random: Symbols" or "Passphrase: Numbers", instead of only a small gray heading above the first one of each group. Saved settings are kept

## [Folders and Proton Pass CLI 2.5.1] - 2026-11-17

- Your Proton Pass folders show in Browse Items: a vault shows its folders first, with how many items each holds, empty ones included, then the items in none of them. Enter opens a folder on its subfolders, then its own items, with Sort by in its search bar, and Esc goes back up. All Vaults still shows every item
- The item details have a Folder row under Vault
- Vaults have a box icon instead of a folder, now that folders have it
- The folders come from one more pass-cli command per vault, run along with the vault's items, and are saved with them so that they show at once next time
- The extension installs Proton Pass CLI 2.5.1 instead of 2.3.3, which brings folders, proxy fixes and network updates. The copy of the previous version is deleted once the new one is installed
- The CLI Path preference says which pass-cli version the extension downloads
- The README no longer suggests `pass-cli login --interactive`: pass-cli 2.5.0 removed logging in with a password in the terminal, leaving the browser login and personal access tokens

## [Shared with Me, Sorting and TOTP] - 2026-11-09

- Items shared with you one by one show in Browse Items, under Shared with Me in the vault list and the vault menu, as in Proton Pass. They were missing, since they're in none of your vaults. They're also in All Vaults, the search and Get TOTP Code, and one that's also in one of your vaults shows once, with that vault
- After half an hour unused, pass-cli first catches up with your account's changes, which can take several seconds. Items opened meanwhile, e.g. to fill a login, waited as long again, since each pass-cli command did it too. They now wait for the session check, which does it once
- The vaults' items no longer wait for the list of items shared with you, which can take seconds. Overlapping loads, e.g. the vault list and the items it opens, run at most 8 pass-cli commands at once together
- Get TOTP Code generates its codes on your Mac from the item listing, instead of starting one pass-cli command per item, all at once, every 30 seconds. The TOTP secrets they come from stay in memory only, never in the cache
- Fill Login and the Paste actions keep Raycast open while the item or its TOTP code loads, with a toast saying so, instead of closing at once with no sign of progress
- The browser login screens show a spinning toast while waiting for the browser, finishing the login and loading your items
- Once logged in, the Login command's main action is Logout, which asks for confirmation. Re-Run Browser Login is gone: logging in again is only needed after logging out
- The TOTP code and its countdown no longer move every second, in the item details and in Get TOTP Code: they're written in fixed-width digits, with the countdown first in the details. A Raycast progress circle empties by quarters as the code's time runs out, in both places. The code and the circle are green for the first half of the period, yellow for the next quarter and red for the last. The code's two halves are set further apart, as in Proton Authenticator. Get TOTP Code says Loading… while a code loads and Unavailable when it couldn't, instead of "---" for both, as in the details. Its "Refreshing in" header is gone, since each code has its countdown
- Get TOTP Code shows the same icons as Browse Items: each login's initials, or its website's icon with the Website Icons preference, instead of a generic login icon. That preference now says it needs a Favicon Provider set in Raycast's settings: without one, initials showed with no explanation
- Get TOTP Code can hide its codes behind dots, with its new Codes preference, as Proton Authenticator does. Show Codes (⌘H) shows them while the command stays open, and copying still works
- Browse Items and Get TOTP Code each have a Sort items by preference: most used, name, last modified or date created. Sort by (⌘⇧S) in the actions changes the order until the window closes. Items never used from Raycast now follow the used ones by name, instead of in pass-cli's order. Get TOTP Code, which wasn't sorted at all, puts the codes you use first too, from the same history as Browse Items
- Get TOTP Code has Browse Items' vault menu in the search bar: All Vaults, each vault with codes and how many, and Shared with Me. Like Browse Items, it opens on the vault chosen last
- Browse Items has a Sort vaults by preference for its vault list and vault menu: by name, the default, by item count or by the vaults you open most, instead of pass-cli's order. The menu at the top right of the vault list, or Sort by (⌘⇧S), changes the order until the window closes. Get TOTP Code's vault menu lists vaults by name
- List Vaults opens Browse Items on the vault list instead of showing its own copy of it, so that Browse Items' preferences apply there too. Its hotkeys and aliases still work
- TOTP's symbol is a progress circle instead of a clock, which looked like loading: in the item list, where it follows the current period too, with the same colors, on the Copy and Paste TOTP Code actions, and in the details. In the details, rows without a value no longer show an icon next to their dash
- In the details, Website, Note, Vault, Type and Last Modified are in gray, with their icons, so that the credentials above them stand out: Raycast no longer draws the line that set them apart
- Generate Password's preferences say which type they apply to, with "Random:" or "Passphrase:" in their titles, since Raycast can't gray out the other type's. Passphrases have their own Include Numbers setting, on by default, instead of sharing Numbers with random passwords

## [Browse Items] - 2026-11-01

- Search Items and List Vaults become one screen, Browse Items. It opens on the items, and Esc goes back to the vault list, where All Vaults opens every item again. List Vaults opens it on the vault list
- Search Items is now named Browse Items. The hotkeys and aliases of both commands keep working, and so do your preferences
- Browse Items checks the pass-cli session before showing saved items and vaults: when it has ended, the login screen shows right away, instead of items whose passwords can't load. When pass-cli is slow to answer, the saved items show after a second, and the login screen replaces them if the session has ended
- Browse Items says TOTP code rather than 2FA code, like Get TOTP Code: Copy TOTP Code, Paste TOTP Code, and the TOTP Code row of the details. 2FA covers other methods too, such as SMS codes

## [CLI Not Found Screen] - 2026-10-13

- The screen shown when pass-cli can't be found points to the CLI Path preference, with an Open Extension Preferences action. It used to ask to install pass-cli, which the extension already does by itself
- Search Items and Get TOTP show that screen too, instead of their saved items, whose passwords and codes can't load without pass-cli

## [Login Fixes] - 2026-10-10

- Login with Browser no longer fails when the extension is opened again right after logging in in the browser. The extension ran other pass-cli commands while pass-cli was saving the new session, and pass-cli then deleted that session "for security": the browser showed a successful login, and the extension stayed logged out without saying why. No other pass-cli command runs during a login now
- pass-cli runs the login on its own, so it completes even if Raycast closes while you're in the browser
- While the login runs, the screen says what's left: log in in the browser, then the login finishing, with Open Login Page Again and Cancel Login. Once logged in, it says so while the items load, instead of showing an empty list. A failed login says why
- Get TOTP's Not Logged In screen can log in too
- The Login command has a Logout action, after a confirmation, with Force Logout when ending the session on Proton's servers fails
- Not Logged In screens have a Check Again action (⌘R), to pick up a session started elsewhere, such as a browser login that completed after Raycast had closed
- Open Terminal Login runs the same pass-cli as the rest of the extension, including the one it installed, instead of whichever `pass-cli` the shell finds, and brings Terminal to the front
- List Vaults shows fetched vaults and item counts without waiting for optional sharing lookups

## [Item Counts and Shared Vaults] - 2026-10-10

- The vault menu of Search Items shows the number of items in each vault, and in all vaults. The selected one stays in the search bar
- List Vaults shows the number of items in each vault. Its refresh lists the items too, which also keeps Search Items' cache fresh
- List Vaults marks shared vaults with an icon. Its tooltip says whether you shared the vault, or it was shared with you and with which role (Manager, Editor or Viewer)

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
