# Passbolt Changelog

## [1.0.0] - 2025-12-01

### Features

#### 🔍 Search Passwords
- Search and browse your entire Passbolt vault from Raycast
- Client-side filtering for instant search results
- Separate sections for favorites and regular items
- Quick actions: copy password, copy username, open URI
- Detailed view with metadata, tags, and notes

#### ➕ Create Password
- Create new password entries with an intuitive form
- Fields: name, username, URI, password, description
- Integrated password generator for secure password creation
- Encrypted storage using PGP encryption

#### 🔑 Password Generator
- **Interactive Mode**: Full-featured form with real-time preview
  - Adjustable length (8-128 characters)
  - Character type selection (uppercase, lowercase, numbers, symbols)
  - Exclude ambiguous characters option
  - Exclude similar characters option
  - Password strength indicator
- **Quick Mode**: No-view command for instant generation
  - Copy to clipboard
  - Paste to active app
  - Copy and paste

#### 🔐 Authenticator (TOTP)
- Dedicated view for Time-based One-Time Passwords
- Automatically scans vault for TOTP-enabled resources
- Real-time countdown timer with color-coded urgency (30-second cycle)
- Quick copy and paste actions for 6-digit codes
- Progress indicator during vault scanning

### Technical Implementation

#### Authentication
- GPGAuth (PGP-based authentication) implementation
- Multi-Factor Authentication (MFA) support with TOTP
- Secure session management with cookie handling
- CSRF token support

#### Security
- OpenPGP encryption for all secrets
- Private key never leaves your machine
- Passphrase stored securely in Raycast's encrypted preferences
- All API communication over HTTPS

#### API Integration
- Full integration with Passbolt API v5.0.0
- Endpoints: authentication, resources, secrets, resource types, MFA
- Proper error handling and retry logic
- Type-safe TypeScript implementation

### Dependencies
- `@raycast/api`: Raycast extension API
- `openpgp`: OpenPGP implementation for encryption/decryption
- `otpauth`: TOTP/HOTP code generation
- `node-fetch`: HTTP client for API requests

### Configuration
Required preferences:
- Passbolt URL (your instance URL)
- Private Key File (armored PGP private key)
- Passphrase (for private key)
- TOTP Secret (optional, for MFA)

### Platform Support
- macOS
- Windows

### Known Limitations
- Requires Passbolt instance with API access
- GPGAuth authentication only (no OAuth support yet)
- Read and create operations supported (update/delete coming in future releases)
