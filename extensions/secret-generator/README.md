# Developer Secret Generator for Raycast

Generate rule-compliant passwords, memorable passphrases, and developer-ready secrets. Every value is generated locally, then copied, pasted, or copied while Raycast closes. Copied values are marked confidential, so Raycast does not record them in Clipboard History.

## Commands

- **Generate Password** — choose a length from 4–256 and the character groups to use. The generated password always includes every selected group; its live entropy estimate makes the trade-off clear.
- **Generate Passphrase** — choose 4–8 randomly selected words, separator, and capitalization. Six words provide about 48 bits of entropy; eight provide about 64 bits.
- **Generate Secret** — create secrets in Base64URL, hexadecimal, URL-safe, or UUID v4 formats. Choose a length of 8–512 for all but UUID v4.
- Use one-action presets for 8, 12, 16, 20, or 24-character passwords.
- Use simple 8, 12, 16, 24, or 32-character presets when a site only accepts unambiguous letters and digits.
- Generate a 32-character URL-safe webhook secret using `A-Z`, `a-z`, `2-9`, `-`, and `_`.

## Why This Extension

Developer Secret Generator combines password and passphrase generation with developer-ready formats such as Base64URL, hex, URL-safe strings, UUID v4, and one-action webhook-secret presets. It works entirely locally and never sends generated values over the network.

## Preferences

- **After Generating** — copy and close Raycast (default), copy only, or paste into the previously focused app.
- **Use easy-to-read characters only** — removes ambiguous characters such as `O`, `0`, `I`, `l`, and `1` from password presets. Password presets still guarantee uppercase, lowercase, and digits; symbols are omitted in this mode.

All values are generated locally with the system cryptographic random number generator. Nothing is sent over the network or stored by the extension.

## Development

Run `npm run dev` to load the extension in Raycast development mode. Before publishing to the Raycast Store, replace the `author` value in `package.json` with your verified Raycast Store handle.
