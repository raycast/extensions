# 2FAS Authenticator

Search and copy TOTP codes from [2FAS](https://2fas.com) exports directly in Raycast. No cloud, no network calls. Your secrets stay local in an encrypted vault.

<a href="https://www.raycast.com/Lock/2fas-authenticator"><img src="https://www.raycast.com/Lock/2fas-authenticator/install_button@2x.png" height="64" alt="Install 2FAS Authenticator" style="height: 64px;" /></a>

## Features

- **Search OTP**: browse all services with native Raycast filtering and live TOTP countdown
- **Recent OTP**: quick access to pinned and recently used services
- **Import Vault**: import encrypted `.2fas` export files
- **Setup**: check vault status, re-import, or delete

## Why

This extension lets you access your 2FAS TOTP codes directly in Raycast by importing a 2FAS export and generating codes locally on your computer.

## Getting Started

1. Open 2FAS on your phone
2. Go to **Settings > 2FAS Backup > Export** and set a password
3. Transfer the `.2fas` file to your computer
4. In Raycast, run **Import Vault** and select the file
5. Enter your export password
6. Run **Search OTP** to find and copy codes

## Commands

| Command | Description |
| --- | --- |
| Search OTP | Search all services, copy codes with live countdown |
| Recent OTP | Access pinned and recently used services |
| Import Vault | Import a `.2fas` export file |
| Setup | View vault status and manage configuration |

## Security Model

| Layer | Detail |
| --- | --- |
| Vault key | Random 256-bit key stored in the macOS Keychain on macOS or protected using Windows DPAPI (`CurrentUser`) on Windows |
| Vault file | AES-256-GCM encrypted and stored in Raycast's extension support directory |
| Import | Decrypts `.2fas` in memory (PBKDF2 + AES-256-GCM), then re-encrypts it into the local vault |
| Secrets at rest | No plaintext TOTP secrets are stored on disk |
| Network | Zero network calls. Everything is offline |
| Clipboard | Concealed copy. OTP codes are excluded from Raycast clipboard history on supported platforms |
| Dependencies | No external crypto dependencies. Uses the Node.js `crypto` module and platform-provided key protection |

### Platform Key Storage

On macOS, the vault encryption key is stored in the user's Keychain under:

```text
service=com.raycast.2fas-engine
account=vault-key
```

On Windows, the vault encryption key is protected using Windows DPAPI with the `CurrentUser` scope. The protected key is stored separately as `vault-key.dpapi` in Raycast's extension support directory.

The encrypted vault itself is stored separately as `vault.enc`.

### Known Limitations

- On macOS, the vault key is passed as a CLI argument to `/usr/bin/security` and is therefore briefly visible in the process argument vector to same-user processes. This limitation does not apply to the Windows implementation, where the key is passed to the DPAPI helper through standard input.
- Windows DPAPI with `CurrentUser` protects the key against offline access and other Windows users, but it is not designed to protect against malicious code already running as the same logged-in user.
- Secrets remain in the Node.js heap while the extension is using them. JavaScript does not provide reliable secure memory zeroing.

See [SECURITY.md](SECURITY.md) for the full threat model and security details.

## Contributing

Contributions are welcome. For significant changes, consider discussing the change with the extension maintainer first.

### Development Setup

Requirements:

- Raycast
- Node.js 22.22.2 or newer
- npm

Clone the official Raycast extensions repository:

```bash
git clone https://github.com/raycast/extensions.git
cd extensions/extensions/2fas-authenticator
```

Install dependencies:

```bash
npm install
```

Start development mode:

```bash
npm run dev
```

Build the extension:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

Fix lint issues:

```bash
npm run fix-lint
```

### Pull Request Guidelines

1. Fork the `raycast/extensions` repository and create a branch from `main`
2. Keep the pull request focused on one feature or fix
3. Update the README and security documentation when behavior changes
4. Update `CHANGELOG.md`
5. Make sure `npm run build` passes
6. Make sure `npm run lint` passes
7. Describe what changed, why it changed, and how it was tested

### Reporting Bugs

When reporting a bug, include:

- Steps to reproduce
- Expected vs actual behavior
- Operating system and version
- Raycast version

## License

[MIT](LICENSE)
