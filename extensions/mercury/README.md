# Mercury

![Mercury Logo](https://github.com/raycast/extensions/blob/main/extensions/mercury/assets/extension-icon.png?raw=true)

Quickly access your Mercury accounts and transactions directly from Raycast.

[![Find this extension on the Raycast store](https://img.shields.io/badge/Raycast-store-red.svg)](https://www.raycast.com/atkinsmatt101/mercury)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/raycast/extensions/blob/master/LICENSE)
![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

## Getting Started

This extension uses the Mercury API to fetch your account and transaction data. To use it, you'll need to generate an API token from your Mercury account.

### Generating an API Token

1. Log into your Mercury account at [app.mercury.com](https://app.mercury.com)
2. Go to the Settings page
3. Select the user avatar in the top right of the screen
4. Select "Security"
5. Select the "API Tokens" option
6. Generate a new API token

### Securing Your API Token

After generating a token, make sure to save it in a secure password manager. You won't be able to see it again after closing the dialog.

**Important:** Treat your Mercury API token as securely as you would treat any password. Someone who obtains your token can interact with your accounts on your behalf. Never store tokens in source control. If you accidentally expose a token, immediately revoke it and generate a new one from your Mercury dashboard.

### Token Permission Tiers

There are three types of tokens:

1. **Read Only**: Can fetch all available data on your Mercury account. Recommended if you don't need to initiate transactions or manage recipients. Does not require an IP whitelist.

2. **Read and Write**: Can initiate transactions without admin approval and manage recipients. Requires an IP whitelist for security purposes.

3. **Custom**: Can only perform requests on specific granted scopes. Examples:
   - To initiate payments requiring admin approvals or queue payments without a whitelisted IP, use a Custom token with the RequestSendMoney scope.
   - If you only need to fetch accounts and statements, create a Custom token with access to these specific scopes.

For this Raycast extension, a **Read Only** token is sufficient and recommended.

## Features

- View all your Mercury accounts
- Check account balances
- View recent transactions
- Filter transactions by type
- Copy account and routing numbers
- AI-driven financial analyses, summaries, and insights

## Feedback

If you have any issues or feature requests, please [file an issue](https://github.com/raycast/extensions/issues) or contact me via [email](mailto:atkinsmatt101@gmail.com).
