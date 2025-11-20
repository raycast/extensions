# Moneytree

View and manage your financial data from [Moneytree](https://getmoneytree.com/jp/home) directly from Raycast. This extension provides quick access to your financial credentials, accounts, balances and latest transactions without leaving your workflow.

If you're concerned about security, please read the [Regarding Security](#regarding-security) section at the end of this document.

## Authentication

Use the "Login to Moneytree" command and enter your email and password. Your credentials are used only for authentication and are never stored.

## Regarding Security

### Token Storage
- Authentication tokens are stored securely using your system's built-in security (Keychain on Mac, Credential Manager on Windows)
- Tokens are encrypted and only accessible to your user account

See [Raycast's OAuth documentation](https://developers.raycast.com/api-reference/oauth#oauth.pkceclient) for more details.

### Credential Handling
- Your email and password are never stored - they're used only once to log in
- Credentials are sent directly to Moneytree and not saved anywhere in the extension

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
