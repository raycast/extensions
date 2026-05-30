# Security Policy

`local-2fa` stores TOTP secrets locally and never sends them anywhere. This document describes the threat model, the cryptographic design, the known limitations, and how to report vulnerabilities.

> **This is a personal open-source project. It has NOT been independently audited.** Use it at your own risk. For mission-critical accounts, consider a hardware key (YubiKey, Titan) or a vendor-audited authenticator app.

---

## Cryptographic design

- **Cipher:** AES-256-GCM (authenticated encryption).
- **Key derivation:** PBKDF2-SHA256, **600,000 iterations** (OWASP 2023 recommendation).
- **Encryption versioning:** payload includes a `version` field. Current writes use v2 (600k iterations). Vaults written by older versions (v1, 210k iterations) are still decrypted transparently for backward compatibility.
- **Write safety:** writes to the encrypted vault are serialized through an in-process mutex to prevent concurrent-write races (lost updates). Decryption of an unexpected JSON shape throws explicitly instead of overwriting the vault with empty data.
- **Salt:** 16 random bytes per encryption, regenerated on every save.
- **IV:** 12 random bytes per encryption, regenerated on every save.
- **Storage:** the encrypted payload (`version`, `salt`, `iv`, `ciphertext`, `tag`) lives in Raycast `LocalStorage`. The plaintext secrets never touch disk.
- **Master password:** held as a Raycast `password` preference, which Raycast persists in the macOS Keychain and injects into each command at runtime. Minimum length: 10 characters (enforced).
- **TOTP:** RFC 6238 / RFC 4226. Supports SHA1, SHA256, SHA512, 6 or 8 digits, configurable period.

All cryptography uses Node.js built-in `node:crypto` — no third-party crypto dependencies.

Non-crypto runtime dependencies are limited to `qr` (pure-JS QR decoder) and `pngjs` (PNG parser), used only by `Import from QR Image`. They never touch secrets at rest and run only on user-supplied image files.

The cryptographic core (`src/storage.ts`, `src/totp.ts`, `src/google-migration.ts`) is intentionally minimal so it is easy to audit. Test vectors against RFC 6238, plus edge-case tests for `parseOtpauthUrl` and `parseGoogleMigrationUrl`, are included in `src/totp.test.ts` and `src/google-migration.test.ts`. Parsers enforce hard input caps (label/secret length, payload size, parser iterations, account count) to prevent denial-of-service from crafted payloads.

---

## Threat model

### What this protects against

| Threat                                      | Protection                                                                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mac is **stolen while locked**              | macOS FileVault + Keychain protect the master password; encrypted blob is useless without it.                                                                                 |
| Someone reads `LocalStorage` files directly | Blob is AES-256-GCM ciphertext; no plaintext leaks.                                                                                                                           |
| Network attacker                            | Nothing leaves the device. No telemetry, no remote sync.                                                                                                                      |
| Offline brute force of the encrypted blob   | PBKDF2 with 600k iterations + 16-byte random salt slows attackers significantly. Use a strong master password (15+ chars, mixed).                                             |
| Crafted otpauth / migration / QR payload    | Parsers enforce input caps (1 KB base32 secret, 1 KB label, 256-char issuer/account, 64 KB migration URL/payload, 100k parser iterations, 1000 accounts) to bound CPU/memory. |

### What this does NOT protect against

| Threat                             | Why                                                                                                                                                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mac is unlocked and unattended** | An attacker can open Raycast → "List 2FA Codes" and see codes instantly, because the master password is in Keychain. **Mitigation:** lock your Mac when you walk away; enable Raycast → Settings → Advanced → "Require authentication".                    |
| **Malware running as your user**   | Has access to the Keychain entry and to Raycast `LocalStorage`. No userland app can fully protect against this. **Mitigation:** stay up-to-date, avoid sketchy software.                                                                                   |
| **Weak master password**           | A 6-character password defeats PBKDF2. **Mitigation:** use a long, unique passphrase.                                                                                                                                                                      |
| **Forgotten master password**      | There is **no recovery**. The encrypted blob cannot be decrypted. You will need to re-add each 2FA account from the original QR/secret. **Mitigation:** keep your master password in a separate password manager AND keep recovery codes for each service. |
| **Raycast preferences sync**       | If Raycast ever syncs `password` preferences to a backend, the master password would leave the device. As of writing, Raycast preferences are local. Verify in your Raycast settings before relying on this.                                               |

---

## Recovery

There is **no recovery mechanism**. If you lose your master password, your accounts are unrecoverable from this extension.

**Always keep:**

1. Each service's recovery/backup codes (issued when you first enable 2FA).
2. The original QR codes or seed strings, in an offline backup.
3. Your master password in a separate, trusted password manager.

This extension is not a backup. It is one of (at least) two ways to access your 2FA codes.

---

## Reporting a vulnerability

If you find a security issue, please **do not open a public GitHub issue**.

1. Open a GitHub Security Advisory (preferred): `Repository → Security → Report a vulnerability`.
2. Or contact the maintainer privately at `contacto@davidsitjes.com`.

Please include:

- A description of the issue.
- Steps to reproduce.
- The impact you believe it has.
- (Optional) a suggested fix.

This is a hobby project maintained on a best-effort basis — please be patient with response times.

---

## Out of scope

- Cloud sync, multi-device sync, or server-side backups (intentionally not implemented).
- Hardware-key-based unlocking (TouchID/Secure Enclave) — Raycast's authentication setting is the closest available proxy.
- Cross-platform support — macOS / Raycast only.
