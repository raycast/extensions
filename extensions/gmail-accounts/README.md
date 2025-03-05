# Gmail Accounts

A Raycast extension that allows you to quickly access your Gmail accounts in Chrome.

## Features

- 📋 Lists all Gmail accounts connected to your Chrome browser
- 📌 Pin favorite accounts for quicker access
- 🔄 Organize your pinned accounts by moving them up and down
- 🚀 Open Gmail directly in Chrome with a single click

## Installation

1. Ensure Google Chrome is installed on your Mac
2. Install the extension from the **Raycast Store** → [Gmail Accounts](https://www.raycast.com/lachero/gmail-accounts)

## Usage

1. Open Raycast and type "Gmail Accounts"
2. Select "List Accounts" to see all your connected Gmail accounts
3. Use the actions in the Action Panel to:
   - Open an account in Chrome
   - Pin/unpin accounts
   - Rearrange pinned accounts
   - Copy Gmail URLs

### Keyboard Shortcuts

- `⌘ ⇧ P` - Pin/Unpin an account
- `⌘ ⌥ ↑` - Move pinned account up
- `⌘ ⌥ ↓` - Move pinned account down

## Security Note

This extension accesses Chrome cookies to retrieve your Google account information. It:

- Uses the [chrome-cookie-decrypt](https://github.com/lacherogwu/chrome-cookie-decrypt) package to read cookies from Chrome
- Only accesses cookies from Google domains
- Does not send your data to any external servers except Google's own services
- Stores a cache of your accounts and pinned preferences locally

The extension needs these permissions to show you which accounts you're logged into. If you have security concerns, you can review the [source code](https://github.com/raycast/extensions/tree/main/extensions/gmail-accounts) to see exactly how your data is handled.

## Requirements

- macOS
- [Raycast](https://www.raycast.com/)
- Google Chrome browser installed at `/Applications/Google Chrome.app`

## How It Works

The extension reads your Chrome cookies to identify Google accounts you're logged into, then displays them in a convenient list within Raycast. You can then quickly access your Gmail inbox for any account with a single click.
