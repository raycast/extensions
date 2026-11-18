# Passbolt Raycast Extension

A powerful [Raycast](https://raycast.com) extension for managing your [Passbolt](https://www.passbolt.com) passwords directly from your macOS menu bar.

## Features

### 🔍 Search Passwords
Quickly search and access your Passbolt vault directly from Raycast. View password details, copy credentials, and access TOTP codes with keyboard shortcuts.

Search supports legacy resources and [Passbolt v5 encrypted metadata](https://www.passbolt.com/docs/development/resources/v5-encrypted-metadata/).
Names, usernames, notes, all URLs, and tags are decrypted locally before searching. Search terms match in any
order and across fields: `pfeiffer office` finds the entry whose email contains "pfeiffer" and whose name
contains "office", and every term must match. Personal metadata uses your private key;
shared metadata uses the metadata key encrypted for your account. Shared key envelopes must be signed by your account,
match the configured Passbolt instance, and have matching fingerprints. Keys are cached only in memory for the command's lifetime.
Entries that cannot be decrypted remain visible with an error indicator, and a toast reports the failure.

Matching passwords appear in **Current Website · <host>** above Favorites, without duplicates. Exact-host
matches come before same-domain matches, then favorites and names determine the order. Search filters apply
to this section too. The first available match is selected once as entries load, including when the website
resolves later; typing or navigating away from the first result cancels this automatic selection.

**Website Matching → Show passwords for the current website first** is enabled by default in the Search
Passwords command's preferences. It uses the [Raycast Browser Extension](https://www.raycast.com/browser-extension)
when accessible, or a URL supplied in launch context, without prompting for browser access. Website lookup runs
alongside progressive vault loading. With matching disabled, no active website, or no match, the usual
Favorites / Other Items layout remains available.

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
- Identifies TOTP-capable resource types before decrypting accounts
- Downloads secrets only for TOTP-capable entries, in ID-filtered batches, and unlocks your private key once per command
- Resolves accounts independently and displays results as they arrive, so the first codes appear quickly
- Includes entries containing both a password and TOTP
- Searches names, usernames, all URLs, tags, notes, and account labels; `OCI` also finds Oracle accounts
- Shows matching current-website accounts first when the Raycast Browser Extension is available
- Real-time countdown timer with color-coded urgency
- Quick copy and paste actions
- Honors each account's algorithm, code length, and refresh period

Website matching is optional in the Authenticator command's preferences. It uses an unambiguous active tab from the
[Raycast Browser Extension](https://www.raycast.com/browser-extension), or a URL supplied in command launch context.
Without browser access, all accounts remain searchable. Matching uses saved URL hostnames and the Public Suffix List,
including private suffixes, rather than substring matching. Use **Refresh Accounts** (`⌘R` on macOS, `Ctrl+R` on Windows)
to reload vault changes. `↵` copies the selected TOTP code to the clipboard and `⌘↵` (`Ctrl+↵` on Windows) pastes it
into the previous app — both are shown in the action bar at the bottom right.

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

The Authenticator reads resource-type schemas to skip password-only entries, reuses the encrypted secrets returned
by the resources endpoint, and decrypts only TOTP candidates. Unknown custom resource types are also inspected so their
accounts are not silently omitted. The complete secret object is parsed, including entries that contain both a password
and TOTP. Configurations use this format:

```json
{
  "password": "your-password",
  "totp": {
    "secret_key": "BASE32ENCODEDSECRET"
  }
}
```

For each resource with TOTP configured, the extension:
1. Generates the current code using the configured SHA1/SHA256/SHA512 algorithm and code length
2. Calculates time remaining using the account's refresh period (30 seconds by default)
3. Updates in real-time with color-coded urgency indicators and generates a fresh code at copy/paste time

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
