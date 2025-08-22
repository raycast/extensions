# Ente Auth for Raycast

A secure two-factor authentication extension for Raycast that integrates with Ente.

## Features

- Securely store and manage two-factor authentication codes
- Automatic synchronization with your Ente account
- Support for TOTP, HOTP, and Steam authentication codes
- Add custom authentication codes manually
- End-to-end encryption of your authentication secrets
- Real-time code generation with visual countdown timers

## Usage

1. Use the "Login to Ente" command to authenticate with your Ente account
2. View your authentication codes with the "View Auth Codes" command
3. Add custom authentication codes with the "Add Auth Code" command

## Security

- All sensitive data is encrypted using AES-GCM
- Your master password is never stored on disk
- Authentication secrets are only decrypted when needed

## Development

This extension is built using:

- React
- TypeScript
- Raycast Extension API
- CryptoJS for encryption

## License

MIT
