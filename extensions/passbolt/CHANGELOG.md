# Passbolt Changelog

## [Current Website Matching] - 2026-10-21

- Show passwords matching the current website above Favorites in Search Passwords, ordered by exact hostname, favorite status, and name.
- Enable optional Website Matching in the Search Passwords preferences, using the browser extension or launch context.
- Keep the current-website match selected while the rest of the vault loads in both commands, instead of letting progressive loading move it.
- Match entries by tab title and known aliases (such as Oracle) when no saved URL matches, and handle several open browser windows.
- Share the website matching helpers between Search Passwords and Authenticator while preserving their ranking behavior.

## [Faster TOTP Codes and Leaner Loading] - 2026-10-17

- Load the vault list without secret payloads and download secrets only for TOTP-capable entries, in ID-filtered batches.
- Resolve each account independently so one slow secret no longer delays the codes behind it, and show first codes sooner.
- Cancel remaining fetch and decryption work when a command closes; refreshing afterwards recovers cleanly.
- Show the paste shortcut for TOTP codes in the action bar: `⌘↵` pastes the code into the previous app.
- Stop logging cookies, CSRF tokens, authentication nonces, response bodies, and private key paths.

## [Faster Authenticator and Complete Account Search] - 2026-10-17

- Select TOTP-capable entries before decryption, reuse included secrets, and unlock the private key once per command.
- Load accounts progressively and include password-plus-TOTP entries that were previously omitted.
- Cache shared metadata-key request failures for each load and retry when refreshing accounts.
- Search account names, usernames, all URLs, tags, notes, and Oracle's OCI alias.
- Match every search term, each in any field, so `pfeiffer office` finds entries combining that email and name.
- Prioritize saved URLs matching the current website when browser context is available.
- Honor each account's algorithm, digits, and period, and generate a fresh code when copying or pasting.
- Support Authenticator refresh, copy, and paste shortcuts on both macOS and Windows.
- Speed up loading with a shared client, parallel authentication and schema requests, streamed metadata
  decryption, and cached search indexing.

## [Fix Search for Encrypted Metadata] - 2026-10-17

- Decrypt Passbolt v5 metadata with personal and shared metadata keys before searching.
- Search all resource URLs and preserve support for legacy resources with missing fields.
- Show metadata decryption failures without preventing readable entries from loading.

## [Fix Search Crash on Resources Without a Name] - 2026-10-16

- Fix `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` when searching resources returned without a `name` by a self-hosted Passbolt instance ([#32415](https://github.com/raycast/extensions/issues/32415))

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
