<p align="center">
  <img src="./assets/local2fa.png" alt="Local 2FA — Offline TOTP manager for Raycast" width="100%" />
</p>

# Local 2FA for Raycast

<p align="center">
  Offline, local-first 2FA TOTP manager for Raycast on macOS.
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./docs/i18n/README.es.md">Español</a> ·
  <a href="./docs/i18n/README.pt-BR.md">Português (BR)</a> ·
  <a href="./docs/i18n/README.de.md">Deutsch</a> ·
  <a href="./docs/i18n/README.fr.md">Français</a>
</p>

<p align="center">
  <a href="https://github.com/vayaSEO/local-2fa/releases"><img src="https://img.shields.io/github/v/release/vayaSEO/local-2fa?display_name=tag" alt="Latest Release" /></a>
  <a href="https://github.com/vayaSEO/local-2fa/blob/main/LICENSE"><img src="https://img.shields.io/github/license/vayaSEO/local-2fa" alt="License" /></a>
  <a href="https://github.com/vayaSEO/local-2fa/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/vayaSEO/local-2fa/ci.yml?branch=main" alt="CI" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D20-339933" alt="Node >=20" />
  <img src="https://img.shields.io/badge/local--first-no%20cloud-informational" alt="Local-first" />
  <img src="https://img.shields.io/badge/crypto-AES--256--GCM-blue" alt="AES-256-GCM" />
</p>

> Personal open-source project. Not independently audited.

---

## Preview

<p align="center">
  <img src="./metadata/local-2fa-1.png" alt="List Codes view" width="850" />
</p>

<p align="center">
  <img src="./metadata/local-2fa-2.png" alt="Add Account view" width="850" />
</p>

<p align="center">
  <img src="./metadata/local-2fa-3.png" alt="Import from QR Image" width="850" />
</p>

## Why This Exists

- Keep 2FA secrets local on your Mac.
- Avoid cloud sync and external OTP services.
- Use a fast Raycast-native workflow for daily copy/paste.

## Features

- RFC 6238 TOTP generation (`SHA1`, `SHA256`, `SHA512`)
- 6 or 8 digits, configurable period
- Local encrypted storage (`AES-256-GCM`)
- Local import support for:
  - `otpauth://` URL
  - `otpauth-migration://` URL (Google Authenticator export)
  - PNG QR image files (decoded locally, pure JS, no external binary)

## Commands

- **List Codes** — view, copy, paste, and delete accounts
- **Add Account** — unified flow:
  - paste `otpauth://` URL
  - autofill fields from URL
  - or enter fields manually
- **Import Google Migration** — paste `otpauth-migration://...`
- **Import from QR Image** — choose one or more local PNG QR images

## Quick Start

For regular use, you only need Raycast + extension setup.

```bash
npm install
npm run lint
npm test
npm run dev
```

## Requirements

- macOS
- Raycast
- Node.js 20+

No external binaries are required. `Import from QR Image` decodes PNGs in
pure JavaScript (`qr` + `pngjs`). Re-export QR images as PNG if you have
them in another format.

## Security Model (Short)

- Encryption: `AES-256-GCM`
- KDF: `PBKDF2-SHA256` (600,000 iterations, OWASP 2023)
- Salt: random 16 bytes per save
- IV: random 12 bytes per save
- Master password: Raycast `password` preference (stored by Raycast in macOS Keychain)
- Encryption versioning: v2 current, transparent backward-compat with v1 vaults (210k iter)

See full threat model in [SECURITY.md](SECURITY.md).

## Recovery Warning

If you lose your Master Password, encrypted data cannot be recovered.
Always keep:

- service recovery codes
- original setup secrets / QR payloads
- a separate backup of your own credentials

## Limitations

- No cloud sync (by design)
- No cross-device sync (by design)
- No account export yet

## Contributing

1. Fork or clone.
2. Create a branch.
3. Run `npm run lint && npm test && npm run build`.
4. Open a PR with a clear change summary.

Maintainer workflow details: [MAINTAINERS.md](MAINTAINERS.md).

## Vulnerability Reporting

Do not open public issues for security vulnerabilities.
Use [GitHub Security Advisories](https://github.com/vayaSEO/local-2fa/security/advisories/new) or contact `contacto@davidsitjes.com` privately.

## License

MIT. See [LICENSE](LICENSE).
