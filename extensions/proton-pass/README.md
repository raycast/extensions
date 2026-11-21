# Proton Pass

Search and manage your Proton Pass items directly from Raycast.

## Setup

This extension requires the Proton Pass CLI (`pass-cli`) to be authenticated.

### 1. CLI Installation (Automatic)

The extension automatically downloads and installs the Proton Pass CLI on first use. No manual installation required!

On macOS, the extension uses the Proton Pass CLI installed on your Mac instead, when it's version 2.5.1 or later. Raycast and the terminal then run the same pass-cli, so macOS doesn't ask for keychain access each time you switch between them. To install it with Homebrew:

```bash
brew install protonpass/tap/pass-cli
```

Or download it from the [Proton Pass CLI Documentation](https://protonpass.github.io/pass-cli/). If the extension already runs the copy it downloaded, it switches to yours after you log out with the Login command: switching while logged in would make macOS ask for keychain access again.

### 2. Authenticate

Run the login command in your terminal:

```bash
pass-cli login
```

This uses web login: `pass-cli` prints a URL, you complete authentication in your browser, and the session is saved locally.

You can also log in from Raycast, with the Login command or Login with Browser on the Not Logged In screen. The login keeps going if Raycast closes while you're in the browser, and the extension picks it up when you come back. After a login done elsewhere, such as in the terminal, Check Again (⌘R) picks up the new session. To log out, use Logout in the Login command.

### 3. Verify

Test that the CLI is working:

```bash
pass-cli vault list
```

## Browse Items

Browse Items opens on your items. Esc goes back to the vault list, where All Vaults opens every item again. List Vaults opens Browse Items on the vault list. Items shared with you one by one, outside your vaults, are under Shared with Me, as in Proton Pass.

A vault, opened from the vault list or the vault menu, shows its Proton Pass folders first, empty ones included, then the items in none of them. Enter opens a folder on its subfolders, then its own items, and Esc goes back up. An opened folder has Sort by in its search bar, where a vault has its vault menu. The search finds what's on screen: an item in a folder shows once its folder is open, or in All Vaults. The item details say which folder an item is in, under Vault.

The item details show what each type of item holds: a login's username, email, password and TOTP code; a card's cardholder name, number, expiration date, security code and PIN; an identity's name, email, phone number and address, then its other fields that are filled; an alias's address; an SSH key's public and private keys; a Wi-Fi network's name, password and security. Secrets are masked, a card's number showing its last 4 digits only, and every field has a Copy action. Custom fields come last, by section, and custom items show them first.

## Preferences

- **CLI Path**: Path to your own `pass-cli` executable, version 2.5.1 or later. With the default, `pass-cli`, the extension uses the version installed on your Mac or downloads version 2.5.1.
- **Primary Action**: What Enter does on an item: view its details (default), copy or paste the password, fill the login, copy or paste the TOTP code, or open the website. Pasting and filling are for macOS; on Windows, they copy instead. If an item lacks what the selected action needs, it opens its details. A note shows its note.
- **Fill Login**: Press Return after the password, to submit the login form (off by default)
- **Transient Clipboard**: Keep copied secrets (passwords, TOTP codes, notes, card numbers and codes, private keys, government ID numbers and hidden fields) out of clipboard history
- **Cache Expiration**: How long cached items stay fresh (5 minutes to 30 days; default 5 minutes). Older items still show instantly while they refresh
- **Item List**:
  - Refresh items in the background, even when the cache is still fresh
  - Suggest logins for the active browser tab (requires the Raycast browser extension)
  - Show website icons instead of initials, in Browse Items and Get TOTP Code, from the Favicon Provider chosen in Raycast's Advanced settings, which receives the domains (off by default). With no provider chosen there, initials show

### Browse Items

- **Sort items by**: Order of the items: most used from Raycast (default), name, last modified or date created. Sort by (⌘⇧S) changes it until the window closes
- **Sort vaults by**: Order of the vaults in the vault list and the vault menu: name (default), item count or most used. The menu at the top right of the vault list, or Sort by (⌘⇧S) there, changes it until the window closes
- **Sort folders by**: Order of the folders in an opened vault or folder, and in a selected folder's side panel: name (default), item count (their subfolders' items included) or most opened from Raycast. Sort Folders by (⌘⇧S) on a folder changes it until the window closes

### Generate Password

Generate Password has its own preferences for the settings it starts with. They can all still be changed while generating.

- **Password Type**: Random password or passphrase (default: random)
- **Random: Length**: Characters in random passwords, from 8 to 128 (default: 20)
- **Random: Uppercase letters**, **Random: Symbols** and **Random: Numbers**: Characters in random passwords, all on by default
- **Passphrase: Words**: Number of words, from 3 to 10 (default: 4)
- **Passphrase: Separator**: Hyphens, spaces, periods, commas, underscores, numbers, or numbers and symbols (default: hyphens)
- **Passphrase: Capitalize words** and **Passphrase: Numbers**: Start each word with a capital letter, and include numbers, both on by default

### Get TOTP Code

- **Codes**: Hide codes behind dots, until Show Codes (⌘H) shows them while the command stays open. Copying still works (off by default)
- **Sort items by**: Order of the codes, as in Browse Items but set apart. The vault menu lists vaults by name

## Filling Logins (macOS)

**Fill Login** closes Raycast and fills the login of the app you were using: it pastes the email (or the username when the item has no email), presses Tab and pastes the password. Put the cursor in the first field of the login form before opening Raycast. If the item has a TOTP code, the code is then left in the clipboard, ready to paste on the next screen.

For logins split over several screens, use **Paste Email**, **Paste Username**, **Paste Password** (⌘⇧P) and **Paste TOTP Code** (⌘⇧T) instead. Like Fill Login, Paste Password then leaves the item's TOTP code in the clipboard.

Filling only types into the app Raycast was opened from: if another app comes in front, it stops before the next key, and its message names the app in front.

Values go through the clipboard marked as concealed, so clipboard history skips them. Afterwards, the previous clipboard is restored as far as Raycast can read it (text, HTML or a file), and otherwise cleared.

Filling needs two permissions for Raycast, in System Settings › Privacy & Security:

- **Accessibility**, named **Device Control and Data Access** in recent macOS versions: Raycast must be turned on there
- **Automation**: Raycast must be allowed to control System Events. The first time, macOS asks

When one is missing, filling stops and opens its place in System Settings.

To fill with Enter, set **Primary Action** to _Fill Login_. Enter's action stands alone at the top of the actions (⌘K); otherwise, Fill Login heads the Paste section.

## Troubleshooting

### Keyring Access Issues

If you see keyring-related errors, try:

```bash
pass-cli logout --force
export PROTON_PASS_KEY_PROVIDER=fs
pass-cli login
```

On Windows, if session persistence through Windows Credential Manager reports a `keyring_error`, retry from PowerShell:

```powershell
pass-cli logout --force
$env:PROTON_PASS_KEY_PROVIDER = "fs"
pass-cli login
```

### CLI Not Found

If the CLI is installed but not detected, set the full path in extension preferences:

```
/opt/homebrew/bin/pass-cli
```

### CLI Out of Date

If the extension says the pass-cli at CLI Path is out of date, update it, e.g. with `brew upgrade pass-cli`, or set CLI Path back to `pass-cli`.

### CLI Can't Run

If the extension says the file at CLI Path can't run, CLI Path is a folder or a file you can't run: fix the path, or set it back to `pass-cli`.

### Re-download CLI

If the auto-installed CLI becomes corrupted or you want to force a re-download, use the "Clear CLI Cache" action available in the error screens.
