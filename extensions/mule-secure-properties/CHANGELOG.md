# Mule Secure Properties Changelog

## [Initial Version] - 2026-08-04

- Encrypt and decrypt MuleSoft secure property values from Raycast
- Set a default password in preferences — it prefills the form, and you can edit it for a single run
- Optional wrapping as `![...]` when encrypting, and automatic stripping when decrypting
- Support for Random IV (same as `useRandomIVs` in your Mule config)
- Remembers your last algorithm, mode, and related options after a successful run
- Copy the equivalent Secure Properties Tool CLI command from the action panel
- Clear feedback when the key length looks wrong or the value contains unsupported characters
- Downloads the official Secure Properties Tool automatically on first use (default: MuleSoft latest URL; optional URL/SHA-256 in preferences)
