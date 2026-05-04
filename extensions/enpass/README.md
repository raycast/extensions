# Enpass for Raycast

Access your Enpass vault directly from Raycast. Search entries, copy passwords, and view details without leaving your keyboard.

## Features

- **Search Vault**: Quickly find entries by title, username, label, or category.
- **Copy Credentials**: Copy passwords, usernames, URLs, and custom fields to clipboard.
- **Credential Form**: Inspect all credential fields in a Raycast form.
- **Secure**: Uses your local vault and `enpass-cli`. Supports a keychain-backed unlocked wrapper so the master password does not need to live in the extension preferences.

## Prerequisites

1. **Enpass CLI**: You must have `enpass-cli` installed.
   - Download the latest binary from [GitHub Releases](https://github.com/hazcod/enpass-cli/releases).
   - Or install via Homebrew (if available) or manual placement (e.g., `/usr/local/bin/enpass-cli`).
   - Ensure it is executable: `chmod +x /path/to/enpass-cli`

2. **Enpass Vault**: You need access to your local `vault.enpassdb` file.
   - If you sync via iCloud/Dropbox, locate the local cache or synced file.

## Configuration

After installing the extension, go to **Extensions** -> **Enpass** and configure:

- **Vault Path**: Full path to your Enpass vault directory or `vault.enpassdb` file.
- **Keyfile Path** (Optional): Path to your keyfile if you use one.
- **Master Password** (Optional): Your Enpass master password. Leave empty when using an unlocked/keychain wrapper.
- **Enpass CLI Path**: Full path to `enpass-cli` or an unlocked wrapper. The default is `/opt/homebrew/bin/enpass-cli`.

## Usage

1. Open Raycast and type **Enpass**.
2. Select **List Entries**.
3. Type to filter your vault.
4. Actions:
   - **Enter**: Copy and paste username/email into the focused app.
   - **Cmd+Enter**: Copy and paste password into the focused app.
   - **Cmd+O**: Open the credential form with all available fields.
   - **Copy Password / Copy Login**: Copy fields without pasting.
   - **Open URL / Copy URL**: Open or copy the saved website URL when present.

## Security Note

This extension relies on `enpass-cli` to decrypt your vault on-the-fly. If you configure a master password in Raycast, it is passed to the wrapper through an environment variable and is never logged. Prefer a local keychain-backed wrapper when available.

## License

MIT
