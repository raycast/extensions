# Moneytree

View and manage your financial data from [Moneytree](https://getmoneytree.com/jp/home) directly from Raycast. This extension provides quick access to your financial credentials, accounts, balances and latest transactions without leaving your workflow.

If you're concerned about security, please read the [Regarding Security](#regarding-security) section at the end of this document.

## Authentication

Set your Moneytree email and password in the extension preferences. Your credentials are stored encrypted and used for authentication.

## Regarding Security

### Credential Storage
- Your email and password are stored encrypted in Raycast preferences
- Preferences are secured using your system's built-in security (Keychain on Mac, Credential Manager on Windows)
- Credentials are only accessible to your user account and are never transmitted anywhere except directly to Moneytree
- All credential storage is handled by Raycast's secure preference system

### Token Storage
- OAuth authentication tokens are stored securely using your system's built-in security
- Tokens are encrypted and only accessible to your user account
- See [Raycast's OAuth documentation](https://developers.raycast.com/api-reference/oauth#oauth.pkceclient) for more details

### Auto Re-login
- When enabled (default), the extension will automatically re-authenticate if your refresh token expires
- This uses your stored encrypted credentials to seamlessly maintain access
- You can disable this feature in extension preferences if you prefer manual re-authentication

### Direct Communication
- The extension communicates directly with Moneytree's servers
- No data passes through any third-party services

### Read-Only Access
- The extension only views your data - it cannot make transfers, payments, or modifications

### Open Source
- The source code is open and available for review

### Local Caching
- Data is cached locally to reduce API calls and improve privacy
- Cache expires automatically after a few minutes

### Logout
- Use the Logout action (available in all commands) to clear all tokens and cached data
- After logout, you can manually clear your credentials from extension preferences if desired

### No Data Collection
- The extension doesn't collect or share any data
- Your information stays between you and Moneytree

## Contributing

Contributions are welcome! Please feel free to submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License.

## Disclaimer

- **This is not an official Moneytree product**
- This extension is an independent, open-source project created by the community. It is not affiliated with, endorsed by, or supported by Moneytree. It is provided "as is" and without any warranty
- The developers of this extension are not responsible for any issues, data loss, or security breaches
- Use of this extension is at your own risk
- Moneytree may change their API at any time, which could break this extension
- This extension is not guaranteed to work with future versions of Moneytree's services
