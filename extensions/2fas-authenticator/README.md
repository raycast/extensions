# 2FAS Authenticator

Search and copy TOTP codes from [2FAS](https://2fas.com) exports directly in Raycast. No cloud, no network calls. Your secrets stay local in a Keychain-encrypted vault.

<a href="https://www.raycast.com/Lock/2fas-authenticator"><img src="https://www.raycast.com/Lock/2fas-authenticator/install_button@2x.png" height="64" alt="Install 2FAS Authenticator" style="height: 64px;" /></a>

## Features

- **Search OTP**: browse all services with native Raycast filtering and live TOTP countdown
- **Recent OTP**: quick access to pinned and recently used services
- **Import Vault**: import encrypted `.2fas` export files
- **Setup**: check vault status, re-import, or delete

## Why

2FAS is a great mobile authenticator, but it has no desktop app. This extension bridges that gap by importing your 2FAS export and generating TOTP codes locally on your Mac.

## Getting Started

1. Open 2FAS on your phone
2. Go to **Settings > 2FAS Backup > Export** and set a password
3. Transfer the `.2fas` file to your Mac (AirDrop, iCloud Drive, etc.)
4. In Raycast, run **Import Vault** and select the file
5. Enter your export password. Done.
6. Run **Search OTP** to find and copy codes

## Commands

| Command      | Description                                         |
| ------------ | --------------------------------------------------- |
| Search OTP   | Search all services, copy codes with live countdown |
| Recent OTP   | Access pinned and recently used services            |
| Import Vault | Import a `.2fas` export file                        |
| Setup        | View vault status and manage configuration          |

## Security Model

| Layer           | Detail                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| Vault key       | Random 256-bit key stored in macOS login Keychain via `/usr/bin/security`                                         |
| Vault file      | AES-256-GCM encrypted at `~/Library/Application Support/Raycast/extensions/.../vault.enc` with `0600` permissions |
| Import          | Decrypts `.2fas` in memory (PBKDF2 + AES-256-GCM), re-encrypts into local vault                                   |
| Secrets at rest | No plaintext secrets on disk. Secrets exist only in memory during runtime                                         |
| Network         | Zero network calls. Everything is offline                                                                         |
| Clipboard       | Concealed copy. OTP codes are excluded from clipboard history                                                     |
| Dependencies    | Zero external crypto dependencies. Node.js `crypto` module only                                                   |

### Known Limitations

- The vault key is passed as a CLI argument to `/usr/bin/security` (briefly visible in the process list to same-user processes). This is an inherent limitation of the macOS `security` CLI.
- Secrets remain in the Node.js heap for the lifetime of the extension process. JavaScript has no secure memory zeroing.

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

### Development Setup

```bash
# Clone the repo
git clone https://github.com/LockeAG/raycast-2fas-authenticator.git
cd raycast-2fas-authenticator

# Install dependencies
npm install

# Start development mode (opens in Raycast)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Fix lint issues
npm run fix-lint
```

### Pull Request Guidelines

1. Fork the repository and create your branch from `main`
2. If you've added functionality, update the README if needed
3. Make sure `npm run lint` passes
4. Keep PRs focused. One feature or fix per PR.
5. Write a clear description of what your change does and why

### Reporting Bugs

Open an issue with:

- Steps to reproduce
- Expected vs actual behavior
- macOS version and Raycast version

## License

[MIT](LICENSE)
