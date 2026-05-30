# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Initial Release] - {PR_MERGE_DATE}

First public release.

### Added

- TOTP generation (RFC 6238) with `SHA1`, `SHA256`, `SHA512`.
- Local encrypted storage using `AES-256-GCM`.
- Key derivation with `PBKDF2-SHA256` (600,000 iterations, OWASP 2023).
- `otpauth://` import support.
- Google Authenticator migration (`otpauth-migration://`) support.
- Unified `Add Account` flow with URL autofill + manual fallback.
- Import from local QR image files (`Import from QR Image`), PNG only.
- Keyboard shortcuts: `Ctrl+X` (Delete account), `Cmd+R` (Reload), `Cmd+I` (Autofill).
- Unit tests for TOTP vectors, `parseOtpauthUrl` edge cases (protocol, hostname,
  invalid secret, missing issuer, out-of-range digits/period/algorithm, length
  caps) and `parseGoogleMigrationUrl` edge cases (HOTP filtered, missing
  secret, wrong protocol, missing data, oversize URL). 19 tests total.
- Security policy and threat model in `SECURITY.md`.
- Multi-language README (`en`, `es`, `pt-BR`, `de`, `fr`).
- GitHub Actions CI (lint + test + build on macOS).

### Security

- **AES-256-GCM** authenticated encryption with random 16-byte salt and
  12-byte IV per save. New writes use payload `version: 2`.
- **KDF**: PBKDF2-SHA256 with 600,000 iterations (OWASP 2023). Backward
  compatibility for legacy `version: 1` vaults (210,000 iterations) is
  transparent — no migration step required.
- **Write race protection**: `upsertAccount` and `deleteAccount` are
  serialized through an in-process promise mutex to prevent concurrent-write
  races that could drop accounts.
- **Corruption guard**: `decryptAccounts` throws explicitly if the decrypted
  JSON is not an array, instead of silently overwriting the vault with empty
  data on next save.
- **Derived-key cache**: PBKDF2 result is cached per `(password, salt, iter)`
  tuple to avoid re-deriving on every storage op (no plaintext password kept
  beyond the existing Raycast preference).
- Input caps to prevent DoS via crafted payloads:
  - `decodeBase32`: 1024-char input cap.
  - `parseOtpauthUrl`: 1024-char raw label cap; 256-char cap on issuer/account.
  - `parseGoogleMigrationUrl`: 64 KB URL cap, 64 KB decoded payload cap,
    100 000 protobuf iterations cap, 1000 accounts cap.
- `storage.ts`: AES-256-GCM failures (wrong password or tampered ciphertext)
  surface a single generic error instead of leaking raw crypto errors.
- `Clipboard.copy` uses `concealed: true` so codes are not retained by
  clipboard history tools.

### Implementation notes

- QR decoding uses pure JS (`qr` + `pngjs`). No external binary (`zbarimg`)
  or `child_process` usage. PNG only by design.
- `Add Account` action order: `Save Account` is primary (Enter submits),
  `Autofill` is secondary.
- ESLint 9 flat config (`eslint.config.js`); `@raycast/eslint-config@^2.1.1`.
  Resolves transitive `minimatch` ReDoS advisories.

### Dependencies

- `@raycast/api` ^1.104.19, `@raycast/utils` ^2.2.5.
- `pngjs` ^7.0.0, `qr` ^0.6.0.
- `@types/react` ^19.2.15, `@types/node` ^22.19.19 (peer-dep alignment).
