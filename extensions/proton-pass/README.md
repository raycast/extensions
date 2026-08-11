# Proton Pass for Raycast

**Unofficial** extension that lets you use Proton Pass directly from Raycast on macOS and Windows. It relies on the [Proton Pass CLI](https://protonpass.github.io/pass-cli/): the extension does not handle or store Proton account credentials.

> This extension is functional, but remains a community project. Always check the destination before pasting sensitive data.

## Features

- 🔎 Global search across **Login** and **Alias** items
- 📋 Quick copy for usernames, emails, passwords, aliases, URLs, and TOTP codes
- 🔐 Item details with masked passwords
- ⏱️ TOTP code generation and automatic refresh
- 📌 Pinning and recent-use ranking for important items
- 🗂️ Vault browsing
- ➕ Vault and Login item creation
- ✏️ Vault renaming and deletion
- 🗑️ Item deletion with confirmation
- 🎲 Custom and instant password generation
- 💾 Local summary cache for faster results while data is loading
- 🪟 CLI detection for macOS and Windows installations

## Requirements

1. [Raycast](https://www.raycast.com/) installed on macOS or Windows.
2. [Proton Pass CLI](https://protonpass.github.io/pass-cli/get-started/installation/) installed.
3. An authenticated Proton Pass CLI session.

The extension checks the CLI on startup. It automatically searches for `pass-cli` / `pass-cli.exe` in `PATH` and common installation locations. If detection fails, enter the full path in Raycast preferences:

**Raycast → Extensions → Proton Pass → Proton Pass CLI Path**

Windows example: `C:\Program Files\ProtonPass\pass-cli.exe`

## Raycast commands

| Command | Usage |
| --- | --- |
| **Search Proton Pass** | Search logins and aliases, view details, and copy useful fields. |
| **Authenticator** | List logins with TOTP and copy their current code. |
| **Browse Vaults** | Browse, create, rename, and delete vaults, then view their items. |
| **Create Login** | Create a Login item in the selected vault. |
| **Generate Password** | Generate a password with a configurable length and character options. |
| **Quick Generate Password** | Immediately generate and copy a strong 20-character password. |

### Search shortcuts

Depuis **Search Proton Pass**, les actions principales sont accessibles avec :

| Shortcut | Action |
| --- | --- |
| `⌘/Ctrl + U` | Copy username or alias |
| `⌘/Ctrl + P` | Copy password |
| `⌘/Ctrl + T` | Copy TOTP |
| `⌘/Ctrl + L` | Copy URL |
| `⌘/Ctrl + F` | Pin or unpin item |
| `⌘/Ctrl + R` | Refresh data |

Shortcuts may vary depending on your platform and Raycast settings.

## Installation and development

```bash
npm install
npm run dev
```

To verify the project:

```bash
npm test                 # tests unitaires
npm run lint             # lint
npm run build            # build de l’extension
npm run test:coverage    # tests avec couverture
```

To install or publish it through the Raycast tools, run `npm run publish` after configuring your publishing environment.

## Security and local data

- The extension never asks for Proton credentials.
- Sensitive operations go through the already authenticated Proton Pass CLI.
- Search caches **summaries** and useful metadata; secrets are not stored in this cache.
- Details and secret fields are fetched only after an explicit action, such as viewing an item or copying a password.
- Pins and last-use timestamps are stored locally in Raycast preferences. They do not modify Proton Pass.
- Vault and item deletion is permanent and requires confirmation.

For more details, see the [usage guide](docs/usage.md), [troubleshooting guide](docs/troubleshooting.md), and [technical documentation](docs/architecture.md).

## Known limitations

- The extension currently supports **Login** and **Alias** items for search and browsing.
- The CLI must be installed and accessible from the environment in which Raycast runs; a CLI available in a terminal may not always be visible to Raycast.
- Features depend on the commands and output format supported by the installed Proton Pass CLI version.

## License

This project is distributed under the [MIT](LICENSE) license. It is not officially affiliated with Proton.
