# User Guide

## Initial setup

1. Install the [Proton Pass CLI](https://protonpass.github.io/pass-cli/get-started/installation/).
2. Sign in with the Proton Pass CLI.
3. Open a Proton Pass command in Raycast.
4. If the CLI is not detected, open the extension preferences and enter the **Proton Pass CLI Path**.

The **Search Proton Pass** command displays a clear status when the CLI is missing, unauthenticated, or unavailable. Use **Check Again** to retry detection.

## Search and use an item

Open **Search Proton Pass**, then search by title, vault name, username, or email address. The list includes Login and Alias items available in your vaults.

Available actions:

- **Show Details**: load item details on demand;
- **Copy Username / Copy Alias**: copy the relevant identifier;
- **Copy Password**: copy the password for a Login;
- **Copy TOTP**: generate and copy the current code;
- **Open URL** and **Copy URL**: open or copy the first URL on a Login;
- **Pin Item**: move an item to the top of the list;
- **Refresh**: fetch fresh data from Proton Pass;
- **Copy Item Reference**: copy a `pass://share-id/item-id` reference.

Unpinned items are then sorted by their last use.

## Use the Authenticator

**Authenticator** lists only Login items that contain a TOTP. Select an account and use **Copy TOTP**. Details for an item with TOTP are refreshed automatically every 30 seconds.

## Manage vaults

In **Browse Vaults**, you can:

- open a vault and search its items;
- create a vault;
- rename a vault;
- delete a vault and all of its items.

Vault deletion is irreversible. An explicit confirmation is shown before the operation.

## Create a Login

The **Create Login** command asks for a vault, title, username, email, password, and URL. The form’s **Generate Password** action creates a 20-character password with uppercase letters, numbers, and symbols.

## Generate a password

**Generate Password** lets you choose:

- password length;
- whether to include numbers;
- whether to include uppercase letters;
- whether to include symbols.

The result is automatically copied to the clipboard. **Quick Generate Password** uses a length of 20 with all three character categories enabled.
