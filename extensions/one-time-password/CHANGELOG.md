# One Time Password Changelog

## [Favourites, Backups and Faster Workflow] - {PR_MERGE_DATE}

### Added

- SHA-256 and SHA-512, 7- and 8-digit codes, and periods other than 30 seconds, validated throughout display, copy, paste, URI and QR import.
- Favourites, a Recent filter, and the last five used accounts repeated at the top of the list.
- Rearrange Accounts: pick an account up with ↵ and drop it in a new place. Move Up/Down (Left/Right in the grid) and Move to Top/Bottom keep each section's order separate.
- A grid view with service logos, the code in large type and a countdown ring.
- "Scan OTP QR Code", a no-view command that reads the screen, then a copied link or screenshot, then offers region select. It saves the account and copies its first code in one step.
- "Paste OTP", which pastes the code for the service or username typed as its argument.
- Password-encrypted backups (scrypt and AES-256-GCM) and portable `otpauth://` URI-list exports, with duplicate handling on import.
- Copy Next Code, Copy Username, setup QR codes for moving accounts to a phone, and an optional delay after which copied codes are cleared.

### Changed

- Accounts show the service as the title and the username as the subtitle. Copying a code closes Raycast and confirms with a HUD.
- Google Authenticator multi-QR exports import batch by batch, and "Service:username" labels are split into service and username.
- URI list imports skip invalid lines and report them by line number instead of rejecting the whole file.
- Accounts saved earlier with a key that is not valid Base32 are hidden instead of showing "Invalid secret". They stay in storage; re-add them with the correct key.
- Updated dependencies: Raycast API 2, zod 4, protobufjs 8, ESLint 10 and TypeScript 6.

## [Paste Recent OTP] - 2026-08-03

### Added

- Added "Paste Recent OTP" no-view command that pastes the OTP from the most recently used account into the active app

## [Windows Support] - 2025-08-27

- Added Windows support.

## 2025-05-07

- Added Primary Action switch between Copy to Clipboard and Paste to Active App.

## 2025-02-11

- Provided additional error information when a QR code scan fails.

## 2024-12-04

- Icons will now be displayed black or white depending on the system appearance.

## 2024-11-07

### Added

- Added service provider icons for each account.

## 2024-07-25

### Added

- [Quick insert #11627](https://github.com/raycast/extensions/issues/11627)
  - `CMD + enter` now will paste the OTP into the last focused input
- [Reorder menu items #11628](https://github.com/raycast/extensions/issues/11628)
  - create new option was moved to the bottom of the list
- Reorder accounts
  - ability to reorder accounts
- Key Icon before accounts

### Changed

- [Reorder menu items #11628](https://github.com/raycast/extensions/issues/11628)
  - create new option was moved to the bottom of the list
- Shortcut: Edit Account
  - changed to `CMD + E` to avoid conflict with Paste
- Shortcut: Remove account
  - warning caused by conflict with Raycast
  - changed to `CMD + Backspace`

### Fixed

- Shortcut: Enter a Setup Key
  - warning caused by conflict with Raycast
  - still defaults to `CMD + Enter`

## [Initial Version] - 2023-04-28
