# Proton Authenticator for Raycast

A Raycast extension to quickly access your TOTP entries from Proton Authenticator.

## Features

### Two Import Methods

Choose how you want to sync your TOTP accounts:

- **Local Database (Live)** - Reads directly from Proton Authenticator's local database. Accounts sync automatically on every launch.
- **JSON Export File** - Import from an exported JSON file. Requires manual re-export when adding new accounts.

### Fuzzy Search

Quickly find accounts with partial matches

<video src="https://github.com/user-attachments/assets/4d664351-9a31-45ee-997b-3c5c1f5f0fe0" width="800" autoplay loop controls></video>

### Flexible Sorting

Control how entries are sorted either alphabetically or by usage

<video src="https://github.com/user-attachments/assets/31e3758b-9321-462c-a41d-20004e1c007e" width="800" autoplay loop controls></video>

### Live Refresh (Local Database Mode)

When using Local Database mode, use `Cmd+R` to manually refresh accounts from the database, or simply reopen the extension for automatic sync.

## Setup

### Option 1: Local Database (Recommended)

This method provides automatic synchronization with Proton Authenticator.

1. Open the extension and select **Local Database (Live)**
2. Retrieve your encryption key from Keychain:
   - Open **Keychain Access.app** (search in Spotlight)
   - Search for `me.proton.authenticator`
   - Find the entry with account name starting with `encryptionKey-...`
   - Double-click to open, then click **Show password**
   - Enter your macOS password when prompted
   - Copy the revealed key
3. Paste the encryption key into the extension
4. Your accounts will load automatically and stay in sync

### Option 2: JSON Export File

This method requires manual re-export when you add new accounts.

1. Open Proton Authenticator app
2. Go to Settings > Export
3. Select "Plain text" and save the JSON file
4. Open the extension and select **JSON Export File**
5. Select the exported JSON file

## Keyboard Shortcuts

| Action                                      | Shortcut      |
| ------------------------------------------- | ------------- |
| Copy current code                           | `Enter`       |
| Paste current code                          | `Cmd+Enter`   |
| Copy next code                              | `Cmd+N`       |
| Paste next code                             | `Cmd+Shift+N` |
| Refresh from database (Local Database mode) | `Cmd+R`       |
| Toggle sort mode                            | `Cmd+S`       |
| Reset usage rankings                        | `Cmd+Shift+U` |
| Reset authenticator data                    | `Cmd+Shift+R` |

## Compatibility

macOS 13 or later.

## Privacy & Security

- **Local Database mode**: The encryption key is stored locally in Raycast's secure storage. Your TOTP secrets are decrypted only when the extension is active.
- **JSON mode**: The exported JSON data is stored locally in Raycast's secure storage.
- No data is ever sent to external servers. Everything is processed locally on your machine.
