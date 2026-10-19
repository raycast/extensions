<div align="center">
  <img width="120" height="120" alt="One Time Password icon" src="assets/icon.png" />

  <h1>One Time Password</h1>

  <p>
    <strong>A Raycast extension for configurable TOTP codes, favourites, recents and encrypted backups</strong>
  </p>

  <p>
    <a href="#-key-features">Features</a> •
    <a href="#️-commands">Commands</a> •
    <a href="#️-keyboard-shortcuts">Shortcuts</a> •
    <a href="#-backups-and-exports">Backups</a> •
    <a href="#-license">License</a>
  </p>

  <br/>
</div>

## 🌟 Overview

Generate time-based one-time passwords without leaving Raycast. Copy or paste a code in one keystroke, scan setup QR codes from your screen, and keep your accounts organised with favourites, recents and your own order. Every RFC 6238 setting is supported, and accounts can be moved with password-encrypted backups.

## 🚀 Key Features

| Feature                      | Description                                                          |
| ---------------------------- | -------------------------------------------------------------------- |
| 🔐 **Configurable TOTP**     | SHA-1, SHA-256 and SHA-512; 6, 7 or 8 digits; periods of 1–300 s     |
| ⏱️ **Per-Account Countdown** | Each account counts down on its own period, turning red at 5 seconds |
| ⭐ **Favourites**            | Pin important accounts to the top and filter by favourites           |
| ↕️ **Your Own Order**        | Rearrange accounts by picking one up and dropping it in a new place  |
| 🕘 **Recents**               | The last 5 used accounts also show at the top, with their own filter |
| 📋 **Copy & Paste**          | Copy or paste the current code, or copy the next one ahead of time   |
| 👤 **Copy Username**         | Copy the account's username or email to fill in the login form       |
| ⚡ **Paste OTP**             | Type part of a service name and the matching code is pasted          |
| 📷 **One-Step QR Scanning**  | Scan the screen or a copied screenshot; the account is saved at once |
| 🔄 **Google Authenticator**  | Import migration QR codes, including multi-QR exports                |
| 📱 **Setup QR Codes**        | Show an account's setup QR code to add it to a phone app             |
| 🔗 **otpauth URIs**          | Add accounts from standard `otpauth://totp/` setup URIs              |
| 🛡️ **Encrypted Backups**     | scrypt + AES-256-GCM backup files with a fresh salt and nonce        |
| 📤 **Portable Exports**      | Export a plain `otpauth://` URI list for other authenticator apps    |
| 🙈 **Concealed Clipboard**   | Asks clipboard managers not to record copied codes                   |
| 🧹 **Auto-Clear Clipboard**  | Optionally removes a copied code after a delay you choose            |
| 🚫 **Offline Codes**         | Codes are generated on your Mac; logos are fetched once and cached   |
| 💻 **macOS & Windows**       | Platform-appropriate shortcuts on both                               |

## 🛠️ Commands

| Command                 | Mode    | Description                                                   |
| ----------------------- | ------- | ------------------------------------------------------------- |
| **One Time Password**   | View    | Search accounts, copy or paste codes, manage favourites       |
| **Paste OTP**           | No-view | Paste the code for the service or username you type           |
| **Paste Recent OTP**    | No-view | Paste the code of the most recently used account into the app |
| **Scan OTP QR Code**    | No-view | Add an account from a QR code on screen or in the clipboard   |
| **Import OTP Accounts** | View    | Merge an encrypted backup or a portable URI list              |
| **Export OTP Backup**   | View    | Create an encrypted backup or a portable URI list             |

> **💡 Tip**: Give **Paste Recent OTP** and **Scan OTP QR Code** hotkeys in Raycast Settings, and **Paste OTP** an alias such as `otp`. Typing `otp github` then pastes your GitHub code.

## 🧮 Supported OTP Parameters

| Parameter     | Supported Values           | Default |
| ------------- | -------------------------- | ------- |
| **Algorithm** | `SHA1`, `SHA256`, `SHA512` | `SHA1`  |
| **Digits**    | `6`, `7`, `8`              | `6`     |
| **Period**    | Integer, `1`–`300` seconds | `30`    |

Use the values the service gave you. Choosing 8 digits does not turn a six-digit service into an eight-digit one.

## 💡 Usage

### Add an Account

The fastest way is the **Scan OTP QR Code** command. With the setup page's QR code visible, run it: it reads the screen, then the clipboard (a copied `otpauth://` link or a screenshot copied with `⌃ ⇧ ⌘ 4`), and if neither has a QR code it lets you drag over the code. The account is saved straight away and its first code is copied, ready for the setup page.

The same options are in **One Time Password**:

- **Scan QR Code**: the same screen and clipboard scan
- **Select QR Region**: drag over the area that contains the QR code
- **Add Account**: enter a setup key or paste an `otpauth://totp/` URI, which fills in every field

```
otpauth://totp/GitHub:you@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30
```

### Migrate from Google Authenticator

1. In Google Authenticator, open **Transfer accounts → Export accounts**.
2. Show the export QR code on screen.
3. Run **Scan OTP QR Code**. If Google Authenticator splits the export across several QR codes, scan each one in turn.

### Filter Accounts

Use the dropdown in the search bar to switch between:

- **All Accounts**
- **Favourites**
- **Recent**

Search matches the service and the username, including parts of an email address.

### List or Grid

Use **Show as Grid** (`⌘ ⇧ L`) to switch to tiles. Each tile shows the service logo and name, the username (long ones are shortened in the middle so the domain stays visible), a star for favourites, and the code in large type with a countdown ring. Logos for tiles are downloaded once from the favicon provider set in Raycast and cached on your Mac. **Show as List** switches back, and the choice is remembered.

### Rearrange Accounts

**Rearrange Accounts** (`⌘ ⇧ R`) works like drag and drop, by keyboard: press `↵` on an account to pick it up, move to its new place with the arrow keys or the search, and press `↵` again to drop it there. Favourites and other accounts are ordered separately. For single steps, use **Move Up** and **Move Down** (**Move Left** and **Move Right** in the grid), or **Move to Top** and **Move to Bottom**.

### Preferences

| Preference             | Options                                    | Default           |
| ---------------------- | ------------------------------------------ | ----------------- |
| **Code Visibility**    | Show or hide codes in the list             | Shown             |
| **Primary Action**     | Copy to Clipboard / Paste to Active App    | Copy to Clipboard |
| **Clear Copied Codes** | Never, or after 15 s, 30 s, 1 min or 2 min | Never             |

A code is only cleared if it is still on the clipboard, so anything you copy afterwards is left alone.

## ⌨️ Keyboard Shortcuts

| Action                      | macOS                 | Windows                                 |
| --------------------------- | --------------------- | --------------------------------------- |
| Primary action (copy/paste) | `↵`                   | `Enter`                                 |
| Secondary action            | `⌘ ↵`                 | `Ctrl Enter`                            |
| Copy Next Code              | `⌘ ⇧ C`               | `Ctrl Shift C`                          |
| Copy Username               | `⌘ ⌥ C`               | `Ctrl Alt C`                            |
| Add / Remove Favourite      | `⌘ F`                 | `Ctrl F`                                |
| Add Account                 | `⌘ N`                 | `Ctrl N`                                |
| Edit Account                | `⌘ E`                 | `Ctrl E`                                |
| Move Up / Down (List)       | `⌘ ⌥ ↑` / `⌘ ⌥ ↓`     | `Ctrl Alt ↑` / `Ctrl Alt ↓`             |
| Move Left / Right (Grid)    | `⌘ ⌥ ←` / `⌘ ⌥ →`     | `Ctrl Alt ←` / `Ctrl Alt →`             |
| Move to Top / Bottom        | `⌘ ⌥ ⇧ ↑` / `⌘ ⌥ ⇧ ↓` | `Ctrl Alt Shift ↑` / `Ctrl Alt Shift ↓` |
| Rearrange Accounts          | `⌘ ⇧ R`               | `Ctrl Shift R`                          |
| Remove Account              | `⌃ X`                 | `Ctrl D`                                |
| Show as Grid / List         | `⌘ ⇧ L`               | `Ctrl Shift L`                          |

Codes are generated when an action runs, so a copied code is never a stale cached preview.

## 🛡️ Backups and Exports

| Format                          | Encrypted | Keeps OTP Settings | Keeps Favourites & Recents | Use For                 |
| ------------------------------- | --------- | ------------------ | -------------------------- | ----------------------- |
| **Encrypted OTP Backup (JSON)** | ✅        | ✅                 | ✅                         | Backups and moving Macs |
| **Portable Setup URIs (Text)**  | ❌        | ✅                 | ❌                         | Moving to another app   |

### Encrypted OTP Backup

- Key derived from your password with **scrypt**, data sealed with **AES-256-GCM**
- Every backup gets a fresh salt and nonce
- The password must be at least 12 characters

> **⚠️ Important**: The backup password cannot be recovered. Store it separately from the backup file.

### Setup QR Codes

**Show Setup QR Code** displays an account's QR code so a phone authenticator app can scan it. **Show All Setup QR Codes** steps through every account. It asks first, because anyone who sees a setup QR code can generate your codes.

### Portable Setup URIs

Writes one `otpauth://totp/` URI per line with service, account, secret, algorithm, digits and period. The UI asks for confirmation first because the file contains usable secrets in plain text.

> **💡 Tip**: Not every authenticator can import a URI list. Check that your target app supports it before relying on this format.

Portable export refuses labels it cannot write unambiguously, such as a colon in the issuer. Use an encrypted backup for those accounts.

### ✅ Import and Export Guarantees

- ✅ Imports merge with existing accounts and never replace the vault
- ✅ Exact duplicates are skipped
- ✅ Every account is validated before anything is saved; invalid lines in a URI list are skipped and listed by line number
- ✅ Backups are written as new files and never overwrite an existing one
- ✅ Files get owner-only permissions where POSIX permissions are supported

## 🔒 Security Notes

- Accounts are stored with Raycast's LocalStorage API, the same as the original extension.
- Password encryption applies to exported backup files. It is not an extra lock on the local Raycast vault.
- Anyone who can run code as your logged-in user may be able to read local secrets.
- There is no Touch ID or master-password lock.
- Third-party clipboard managers decide for themselves whether to honour the concealed-copy flag.

## 🧪 Development

```bash
npm test           # OTP reference vectors and backup validation
npm run typecheck  # TypeScript
npm run build      # Raycast build
npm run lint       # Raycast lint
```

The test suite includes all 18 RFC 6238 reference vectors for SHA-1, SHA-256 and SHA-512. QR permissions, native Raycast interaction and pasting into other apps still need a manual check in Raycast.

## 🙏 Credits

- Original extension by [lachero](https://www.raycast.com/lachero/one-time-password) and contributors
- Inspiration from [jaden/totp-generator](https://github.com/jaden/totp-generator)
- [Export Google Authenticator secret OTP-keys](https://gist.github.com/mapster/4b8b9f8f6b92cc1ca58ae5506e0508f7)

## 📜 License

This project is licensed under the MIT License, preserving the original extension's licence and attribution.
