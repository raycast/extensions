# Passbolt Raycast Extension

A powerful [Raycast](https://raycast.com) extension for managing your [Passbolt](https://www.passbolt.com) passwords directly from your macOS menu bar.

## Features

### 🔍 Search Passwords
Quickly search and access your Passbolt vault directly from Raycast. View password details, copy credentials, and access TOTP codes with keyboard shortcuts.

### ➕ Create Password
Create new password entries in your Passbolt vault with an intuitive form interface. Supports:
- Name, username, and URI fields
- Password field with built-in generator
- Description for additional notes
- Encrypted storage using PGP

### 🔑 Password Generator
Generate secure passwords with customizable options:
- **Interactive Mode**: Full-featured form with real-time preview
  - Adjustable length (8-128 characters)
  - Character type selection (uppercase, lowercase, numbers, symbols)
  - Exclude ambiguous characters option
  - Exclude similar characters option
  - Password strength indicator
- **Quick Mode**: No-view command for instant password generation
  - Copy to clipboard
  - Paste to active app
  - Copy and paste

### 🔐 Authenticator (TOTP)
Dedicated view for managing Time-based One-Time Passwords (TOTP):
- Automatically scans vault for resources with TOTP configured
- Real-time countdown timer with color-coded urgency
- Quick copy and paste actions
- Displays 6-digit codes with 30-second refresh cycle

## Installation

### Prerequisites

1. **Passbolt Account**: You need access to a Passbolt instance (self-hosted or cloud)
2. **PGP Private Key**: Your armored PGP private key file
3. **Raycast**: Install [Raycast](https://raycast.com) if you haven't already

### Setup

1. Clone this repository or install from Raycast Store (when published)
2. Open Raycast preferences → Extensions → Passbolt
3. Configure the following settings:

   - **Passbolt URL**: Your Passbolt instance URL (e.g., `https://passbolt.example.com`)
   - **Private Key File**: Path to your armored PGP private key file
   - **Passphrase**: The passphrase for your private key
   - **TOTP Secret** (Optional): Your TOTP secret key for automatic MFA code generation

### Getting Your TOTP Secret

If your Passbolt instance requires Multi-Factor Authentication (MFA):

1. Log into your Passbolt web interface
2. Go to your profile settings → MFA
3. When setting up TOTP, you'll see a QR code
4. Click "Can't scan the code?" or similar to reveal the secret key
5. Copy the base32 string (e.g., `JBSWY3DPEHPK3PXP`)
6. Paste it into the extension's TOTP Secret preference

## Authentication

This extension uses **GPGAuth** (PGP-based authentication) to securely connect to your Passbolt instance. The authentication flow:

1. Retrieves the server's public PGP key
2. Sends your key fingerprint to initiate authentication
3. Decrypts a server-provided nonce using your private key
4. Returns the decrypted nonce to verify identity
5. Handles MFA verification if required

All secrets are encrypted using OpenPGP before transmission and decrypted locally using your private key.

## TOTP Implementation

The extension uses the [otpauth](https://www.npmjs.com/package/otpauth) library to generate TOTP codes. The implementation follows RFC 6238 standards:

### For Passbolt MFA Authentication

```typescript
import { TOTP } from "otpauth";

private generateTOTP(): string {
    if (!this.totpSecret) {
        throw new Error("TOTP secret not configured");
    }

    const totp = new TOTP({
        secret: this.totpSecret,
        digits: 6,
        period: 30,
    });

    return totp.generate();
}
```

### For Resource TOTP Codes

The Authenticator view scans all resources in your vault, decrypts their secrets, and extracts TOTP configurations stored in the following format:

```json
{
  "password": "your-password",
  "totp": {
    "secret_key": "BASE32ENCODEDSECRET"
  }
}
```

For each resource with TOTP configured, the extension:
1. Generates the current 6-digit code
2. Calculates time remaining (30-second cycle)
3. Updates in real-time with color-coded urgency indicators

## API Integration

This extension integrates with the [Passbolt API v5.0.0](https://www.passbolt.com/docs/api/) using the following endpoints:

- **Authentication**: `/auth/verify.json`, `/auth/login.json`
- **MFA**: `/mfa/verify/totp.json`
- **Resources**: `/resources.json`
- **Secrets**: `/secrets/resource/{id}.json`
- **Resource Types**: `/resource-types.json`

All API requests include proper session management, cookie handling, and CSRF token support.

## Development

### Prerequisites

- Node.js 20.x or later
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

### Project Structure

```
passbolt/
├── src/
│   ├── authenticator.tsx      # TOTP authenticator view
│   ├── create.tsx              # Create password form
│   ├── details.tsx             # Password details view
│   ├── generate-password.tsx   # Interactive password generator
│   ├── generate-password-quick.tsx # Quick password generator
│   ├── search.tsx              # Search passwords view
│   ├── lib/
│   │   └── passbolt.ts         # Passbolt API client
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   └── utils/
│       └── password-generator.ts # Password generation utilities
├── assets/
│   └── extension-icon.png      # Extension icon
├── package.json                # Dependencies and commands
└── README.md                   # This file
```

## Security Considerations

- **Private Key**: Your private key never leaves your machine
- **Passphrase**: Stored securely in Raycast's encrypted preferences
- **Encryption**: All secrets are encrypted with OpenPGP
- **Session Management**: Secure cookie-based session handling
- **TOTP Secrets**: Stored locally and used only for code generation

## Troubleshooting

### "Server did not return a nonce token"

This usually means you're already authenticated. Try logging out from Passbolt web interface and retry.

### "MFA is required but no TOTP secret provided"

Add your TOTP secret in the extension preferences. See [Getting Your TOTP Secret](#getting-your-totp-secret).

### "Invalid passphrase or corrupted key"

Verify that:
1. Your private key file path is correct
2. The passphrase matches your private key
3. The key file is in armored ASCII format (begins with `-----BEGIN PGP PRIVATE KEY BLOCK-----`)

### No TOTP resources found

Make sure your Passbolt resources have TOTP configured in the secret data with the structure:
```json
{
  "totp": {
    "secret_key": "YOUR_BASE32_SECRET"
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- [Passbolt](https://www.passbolt.com)
- [Passbolt API Documentation](https://www.passbolt.com/docs/api/)
- [Raycast](https://raycast.com)
- [Raycast Extensions](https://www.raycast.com/store)

## Acknowledgments

Built with:
- [@raycast/api](https://www.npmjs.com/package/@raycast/api) - Raycast extension API
- [openpgp](https://www.npmjs.com/package/openpgp) - OpenPGP implementation
- [otpauth](https://www.npmjs.com/package/otpauth) - TOTP/HOTP implementation
- [node-fetch](https://www.npmjs.com/package/node-fetch) - HTTP client