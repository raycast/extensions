# Ente Auth - Raycast extension for Ente Exports

Easily integrate your **Ente Auth** with Raycast using this simple extension to query your Ente Auth TOTP accounts.

The workflow uses Ente CLI to export your secrets from Ente Auth and then stashes them securely into Raycast's encrypted database.

## Features

- Imports: Ability to dynamically import secrets
- TOTP Code Display: Fetches and displays TOTP secrets exported from Ente Auth.
- Sorted Data: Most used TOTP codes will be displayed at the top. Use ⌘ + [Number] to select.
- Dynamic Icons: Displays service-specific favicons when URL placed in notes section.
- Metadata Display: Shows detailed metadata for each TOTP.
- Progress Indicator: Visual progress indicator for the remaining time of the current TOTP code.
- Tag Support: Displays tags associated with each TOTP secret.
- Clipboard Actions: Allows users to copy the current and next TOTP codes to the clipboard with a single click.

## 🚀 Setup

> The Ente Auth [CLI](https://github.com/ente-io/ente/tree/main/cli) is required.

### Homebrew (Recommended)

You can install the Ente CLI using [Homebrew](https://formulae.brew.sh/formula/ente-cli#default) for a simpler and more automated setup. Run the following command in your terminal:

```bash
brew install ente-cli
```

Once installed, verify the installation:

```bash
ente version
```

### Github Release (Optional)

To use the **Ente Auth** extension, you'll need the **Ente CLI**. Follow the steps below to install it:

1. Visit the [Ente CLI releases page](https://github.com/ente-io/ente/releases?q=tag%3Acli-v0).
2. Download the latest version for **macOS**.
3. Move the binary to `/usr/local/bin` and make it executable with the following commands:

   ```bash
   sudo mv /path/to/ente /usr/local/bin/ente
   sudo chmod +x /usr/local/bin/ente
   ```

Once installed, verify that it's working by running the following command in your terminal:

```bash
ente version
```

### 2. Configure Ente CLI

- Run `ente account add` to authenticate yourself with Ente CLI.
- You'll first be prompted for the app type. Enter `auth`.
- Next, you'll be asked for an export directory. You can choose any path you wish, but it must exist before you press return, else Ente CLI will not accept it.
- Finally, you'll be prompted to provide your Ente login credentials.

> To ensure the extension can import your accounts from Ente Auth, you'll need to define the "Ente CLI Export Location" when you add this extension to Raycast.
> This path should be the same one you configured when adding your Ente account.
> To show the Ente CLI's configured export path, run `ente account list` and refer to the `ExportDir` value.

---

## 📖 Usage Instructions

1. **Launch Raycast**

2. **Import Your Data**
   - To import your Ente Auth TOTP accounts, simply trigger the workflow by running **`Import Secrets`** in Raycast.

3. **Search for an Ente Auth TOTP account**
   - To list all of your Ente Auth TOTP accounts, run `Get TOTP`.
   - Search for a specific account.
   - You can change the preferred action when `Enter` is pressed (e.g. Paste or Copy).
   - The search supports loose search queries, matching words in the account name in any order.
      - For example "Docker Hub" will match with the queries "Docker Hub", "Hub", "Do Hu".

---

### Other Usages

- **Export Secrets** – Creates a file named `ente_auth.txt` in the CLI’s configured export directory (`exportDir`).
- **Delete Export** – Removes the `ente_auth.txt` file from the same directory.

### Manual Imports

To import secrets manually:

1. From your terminal, run:

   ```bash
   ente export
   ```

2. Then in Raycast, run **Import Secrets**.

Alternatively, you can perform both steps using the UI, as long as the `ente_auth.txt` file is placed in the configured export directory.

```bash
# Example of configured export path from `ente account list`
❯ ente account list
Configured accounts: 1
====================================
Email:     ente@domain.com
ID:        1111111111111111
App:       auth
ExportDir: /foo/bar/ente
```

Note: In the extension preferences, **Ente CLI Export Location** refers to the `exportDir` value shown above.

## Disclaimer

This project is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Ente. The official Ente website can be found at https://ente.io. "Ente" as well as related names, marks, emblems and images are registered trademarks of their respective owners.
