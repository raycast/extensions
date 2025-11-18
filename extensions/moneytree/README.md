# Moneytree

View and manage your financial data from Moneytree directly from Raycast. This extension provides quick access to your financial credentials, accounts, balances and latest transactions without leaving your workflow.

If you're concerned about security, please read the [Regarding Security](#regarding-security) section at the end of this document.

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

## Regarding Security

We understand that handling financial data requires the highest level of security. Here's why this extension is safe to use:

### 1. **Industry-Standard Authentication (OAuth 2.0 with PKCE)**
- The extension uses **OAuth 2.0 with PKCE** (Proof Key for Code Exchange), the same secure authentication protocol used by major financial institutions
- PKCE prevents authorization code interception attacks, even if someone intercepts the authorization code
- This is the same authentication method used by the official Moneytree web application

### 2. **Secure Credential Storage**
- Your Moneytree email and password are stored in **Raycast's encrypted LocalStorage**, which is protected by your system's keychain
- Access tokens are stored securely and automatically refreshed when they expire
- No credentials are ever stored in plain text or transmitted to third parties

### 3. **Direct API Communication**
- The extension communicates **directly** with Moneytree's API endpoints
- No data passes through any intermediate servers or third-party services
- All API requests use the same endpoints and security measures as the official Moneytree web application (https://myaccount.getmoneytree.com, https://app.getmoneytree.com)

#### 4. **Read-Only Operations**
- Currently, the extension only performs **read operations** (viewing data)
- No write operations (transfers, payments, modifications) are implemented
- This significantly reduces the risk of accidental or malicious actions

#### 5. **Open Source & Auditable**
- The extension's source code is open and available for review
- You can audit exactly what data is being accessed and how it's being handled
- Community contributions and security reviews help ensure the code remains secure

#### 6. **Local Caching**
- Financial data is cached locally on your device using Raycast's secure cache system
- Cached data reduces the number of API calls and improves privacy
- Cache expires automatically after a short period (2-5 minutes depending on data type)

#### 7. **No Data Collection**
- The extension does not collect, store, or transmit any usage analytics
- No personal or financial data is sent to any service other than Moneytree's official API
- Your data stays between you and Moneytree
