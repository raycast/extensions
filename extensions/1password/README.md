# 1Password

Browse your 1Password items from Raycast, copy or paste credentials and one-time
passwords, open items in the app or the browser, and generate new passwords.

Works with 1Password 8 and 1Password 7. Pick which one you use under
**1Password App Version** in the extension preferences.

## Requirements

### 1Password 8

1. Install the [1Password CLI](https://developer.1password.com/docs/cli/get-started/).
2. Turn on the desktop app integration: **1Password → Settings → Developer →
   Integrate with 1Password CLI**. It lets the app hand the CLI a session, so unlocking
   1Password is enough. Without it you have to sign in through `op signin` instead, which
   the extension prompts for when it cannot find a session.

The extension looks for the CLI in the usual install locations
(`/usr/local/bin/op` and `/opt/homebrew/bin/op` on macOS, the Program Files and WinGet
paths on Windows). If yours lives somewhere else, set **1Password CLI path** in the
preferences.

### 1Password 7

No CLI needed. The extension reads the metadata cache that 1Password 7 keeps in its
own macOS container, so this path only works on macOS and only shows items 1Password 7
has already cached.

## Commands

| Command                      | Version | What it does                                                                                                                        |
| ---------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **My Passwords**             | both    | Lists every item. Open it in 1Password or the browser, copy or paste the username, password, or one-time password, and share items. |
| **My Vaults**                | v8      | Lists your vaults and the items in each one. Shows nothing on 1Password 7.                                                          |
| **Generate Password**        | v8      | Generates a password with the 1Password CLI. Shows nothing on 1Password 7.                                                          |
| **Auto Renew Authorization** | v8      | Runs in the background every 9 minutes to keep the CLI session alive. Off until you turn it on — see below.                         |

### Auto Renew Authorization

The 1Password CLI session expires after about ten minutes. Once it does, the next
command has to re-authorize, and if the desktop app asks you to confirm, that request
blocks until you answer it.

This command keeps the session from getting that far. It is a background command, so
Raycast keeps it disabled until you ask for it: open **Raycast Settings → Extensions →
1Password → Auto Renew Authorization** and enable background refresh in that command's
preferences.

## Preferences

| Preference                        | Applies to | Description                                                                                                                                                                                                                                          |
| --------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1Password App Version**         | both       | Whether to talk to 1Password 8 or 1Password 7.                                                                                                                                                                                                       |
| **Primary Action**                | v8         | What Enter does on a login item.                                                                                                                                                                                                                     |
| **Secondary Action**              | v8         | What the second action does on a login item.                                                                                                                                                                                                         |
| **Close window after copying**    | —          | Currently has no effect. The copy and paste actions show a HUD, which dismisses Raycast either way.                                                                                                                                                  |
| **Reduce item list memory usage** | v8         | Lists a lightweight summary instead of full item details. Username and email subtitles and search over those fields are unavailable until an action fetches the full item, and the list renders the first 200 matches. Useful for very large vaults. |
| **1Password CLI path**            | v8         | Where the `op` binary lives, if it is not in one of the default locations.                                                                                                                                                                           |
| **1Password SHELL path**          | v8, macOS  | Shell used to run `op signin`. Defaults to `/bin/zsh`.                                                                                                                                                                                               |

## Troubleshooting

### "Authentication Required"

The CLI could not reach a signed-in account. The message underneath shows the cause,
though the view cuts off long output after a line or two — use **Copy Error Details**
in the action panel to get the whole thing, including the steps the CLI suggests. Most
often one of these applies:

- The desktop app integration is off. Turn it on under **1Password → Settings →
  Developer**.
- 1Password is locked. Unlock it and run the command again.
- The CLI is installed somewhere the extension does not look. Set **1Password CLI
  path** in the preferences.

### The list shows an error instead of my items

Loading the account or the item list failed. **Retry** runs it again, and **Copy Error
Details** gives you the CLI's full output. An empty list with "No items found" means
the opposite — the commands succeeded and returned nothing.

### Raycast keeps asking me to authenticate

Enable **Auto Renew Authorization** as described above. It refreshes the session
before it expires.

### "1Password CLI is not found"

The extension could not find the `op` binary. Install it, or point **1Password CLI
path** at it.
