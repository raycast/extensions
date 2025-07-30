# One Time Secret - Password.link Extension

A Raycast extension for creating and managing encrypted secrets using [password.link](https://password.link).

## Features

- 🔐 **Create Encrypted Secrets** - Create secure, one-time view secrets with client-side encryption
- 📋 **List & Manage Secrets** - View all your secrets with search and management capabilities
- 🔗 **Secret Requests** - Create request links for collecting secrets from others
- 🗑️ **Delete Secrets** - Remove secrets and secret requests when no longer needed
- 🔧 **Custom Domains** - Support for whitelabel password.link domains
- ⚡ **Fast & Secure** - Built with TypeScript and proper error handling
- 🚀 **Quick Creation** - Create secrets directly from Raycast search with arguments

## Setup

### 1. Get API Keys

1. Sign up for a [password.link](https://password.link) account
2. Navigate to your account settings
3. Generate both a **Public API Key** and **Private API Key**
4. Note your custom domain if you have one (optional)

### 2. Configure Extension

1. Open Raycast and go to Extensions
2. Find "One Time Secret" and click the gear icon
3. Enter your configuration:
   - **Public API Key**: Your password.link public API key
   - **Private API Key**: Your password.link private API key
   - **Base URL**: Your password.link domain (default: https://password.link)

### 3. Start Using

The extension provides four main commands:

- **New Secret**: Create encrypted secrets with various options or use arguments for quick creation
- **List Secrets**: View and manage existing secrets
- **New Secret Request**: Create request links for collecting secrets
- **List Secret Requests**: Manage your secret request links

## Commands

### New Secret

Create a new encrypted secret with two usage modes:

#### Quick Creation with Arguments

```
New Secret "Your message" "secret content"
```

- **Message** (required): Message to show to the recipient
- **Content** (required): The secret content to encrypt

#### Full Form Mode

Type `New Secret` without arguments to access the complete form with options for:

- Secret content (required)
- Description (internal use)
- Message (shown to recipient)
- Expiration time (0-350 hours)
- View button (show button instead of auto-display)
- CAPTCHA protection
- Password protection
- Maximum view count (1-100)

### List Secrets

View all your secrets with:

- Search functionality
- Secret status (active/expired)
- View count and creation date
- Related secret request indicators
- Delete functionality

### New Secret Request

Create request links for collecting secrets with:

- Description and message
- Expiration and usage limits
- Email notifications
- Default settings for created secrets

### List Secret Requests

Manage your secret request links with:

- Search functionality
- Usage limits and expiration
- Quick actions to open or copy URLs
- Delete functionality

## Usage Examples

### Quick Secret Creation

```
New Secret "Login credentials" "username: admin, password: secret123"
```

### Full Secret Creation

1. Type `New Secret` and press Enter
2. Fill out the form with your preferences
3. Click "Create Secret" or press Cmd+S

### Managing Secrets

1. Type `List Secrets` to view all your secrets
2. Search by description or message
3. Click on any secret to view details
4. Use the delete action to remove secrets

## Security

- All secrets are encrypted client-side before being sent to the server
- API keys are stored securely in Raycast preferences
- Secrets are automatically deleted after being viewed (one-time use)
- Support for additional security features like CAPTCHA and passwords
- URLs include the public part for proper decryption

## Custom Domains

If you have a whitelabel password.link domain, simply enter it in the Base URL preference field. The extension will use your custom domain for all generated URLs.

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - see LICENSE file for details.
