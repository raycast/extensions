# Security

This document describes the threat model and security properties of the
2FAS Authenticator Raycast extension. It is intended for security-aware
users and reviewers; the in-app UX is designed to be safe under the
defaults described below without requiring any of this knowledge.

## Threat model

### What we defend against

- **Vault file disclosure on its own.**
  The vault is AES-256-GCM encrypted and the encryption key is stored
  separately, so copying or reading `vault.enc` alone does not reveal
  the stored TOTP secrets.
- **Disk loss / casual filesystem access** to `vault.enc`.
  The encryption key is stored separately from the vault: in the
  macOS Keychain on macOS, or protected with Windows DPAPI
  (`CurrentUser`) on Windows. Without access to the protected key,
  the vault is opaque ciphertext.
- **Malicious or malformed `.2fas` files.**
  Import is bounded (5 MB), JSON-validated, and AES-GCM
  authenticated. Failed parses cannot corrupt or destroy an
  existing vault.
- **User error**: wrong password, wrong file, accidental import.
  Re-import is atomic: the existing vault is replaced only after
  the new export has been fully parsed and re-encrypted to a
  staging file and renamed into place.
- **TOTP secret leakage via clipboard history.**
  All clipboard copies use `concealed: true`, which excludes the
  payload from Raycast clipboard history on supported platforms.
- **Vault corruption from interrupted writes.**
  Writes go to `vault.enc.new` first, then `renameSync` into place
  (atomic on the same filesystem).

### What we do NOT defend against

- **A fully compromised local user session or privileged attacker.**
  An attacker with root/Administrator privileges, or code execution
  as the current user, may be able to read process memory or invoke
  the platform credential-protection mechanism directly. We rely on
  the macOS Keychain and Windows DPAPI as platform trust anchors.
- **Physical access to an unlocked user session.** A user who already
  has access to the logged-in macOS or Windows session can run the
  extension and retrieve codes.
- **Disk forensics on a turned-off, encrypted disk.** Out of scope.
  We rely on the platform's full-disk encryption, such as FileVault
  on macOS or BitLocker on Windows.
- **A coresident process polling `argv` during the brief window
  `/usr/bin/security add-generic-password -w <key>` is running.**
  See "Known limitations" below.

## Known limitations

### macOS vault key briefly visible in process argv
This limitation applies only to macOS. On Windows, the vault key is
passed to the PowerShell DPAPI helper through standard input and is
not included in the process argument vector.

The Apple `security(1)` CLI accepts the keychain item password as
the `-w` argument. We invoke it via `child_process.execFileSync`,
which avoids shell interpolation, but the base64-encoded key still
appears in the process argument vector for the duration of the
call (typically tens of milliseconds).

A coresident process running as the same user could in principle
poll `KERN_PROCARGS2` and capture the key. We accept this trade-off
for two reasons:

1. The clean alternative is a native helper that links against
   `Security.framework`. Ad-hoc-signed binaries cannot access the
   Keychain on macOS 26+, and shipping a notarized binary inside a
   Raycast extension is outside the supported distribution model.
2. A coresident process running as the same user can already dump
   the macOS keychain itself or attach to our Node process. Closing
   the argv window does not raise the bar against an adversary
   with that level of access.

If your threat model includes coresident processes, do not store
high-value TOTP secrets on this machine.

### Plaintext services in memory while a view is open

`Search OTP` and `Recent OTP` keep the decrypted services in
process memory while the view is open so codes can refresh every
second without repeatedly accessing the platform key store. The cache
has a 5-minute idle TTL.

Use **Setup → Lock Vault Now** to clear the in-memory cache in the
Setup process. Note that other already-open command windows
(e.g. an active Search OTP view in another Raycast window) retain
their own cache until you close them or until their TTL expires.

### Re-import reuses the vault key

When a vault key already exists, `setVault` reuses it, so a re-import
changes only the encrypted file. The new ciphertext is written to
`vault.enc.new` and renamed into place atomically. An interrupted
re-import therefore leaves either the old or the new vault fully
intact; the file is never orphaned from a key that was never stored.

A new random key is generated only on first creation, where the file
is written and the key is stored in sequence. A crash in that window
loses nothing recoverable, since there was no prior vault. If the
stored key is ever found corrupt, a re-import re-keys from scratch
(the old ciphertext was already unreadable); any other platform key
storage failure aborts the re-import and leaves the existing vault untouched.

### PBKDF2 iteration count is inherited

The encrypted `.2fas` export format uses
`PBKDF2-SHA256(password, salt, 10_000)`. This is below current
NIST recommendations (600k+) but is fixed by the 2FAS file format
itself, not by this extension. Use a strong export password.

## Cryptographic primitives

- **Vault at rest:** AES-256-GCM, 12-byte IV from
  `crypto.randomBytes`, 16-byte authentication tag verified on
  every load.
- **Key storage:** 32 random bytes from `crypto.randomBytes`.
  On macOS, the key is stored in the user Keychain under
  `service=com.raycast.2fas-engine`, `account=vault-key`.
  On Windows, the key is protected with DPAPI using the
  `CurrentUser` scope and stored separately as `vault-key.dpapi`.
- **TOTP:** RFC 6238, supporting SHA-1 / SHA-256 / SHA-512.
- **Import decryption:** AES-256-GCM, with key derived via
  PBKDF2-SHA256 (10 000 iterations, 32-byte key) per the 2FAS
  export schema.
- **Service IDs:** SHA-256 of `issuer + "\0" + account + "\0" +
secret`, truncated to 32 hex chars. IDs are stored only inside
  the encrypted vault and in Raycast's `LocalStorage` for recents;
  the secret itself never leaves the encrypted vault.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository, or
contact the maintainer listed in `package.json`.
