# JWT Debugger

Decode, encode, edit, re-sign, and verify JSON Web Tokens right inside Raycast

## Features

- **Decode** a JWT into its header and payload.
- **Encode / edit** the header, payload, signing key, and algorithm — the JWT string is re-signed live as you change values.
- **Verify** the signature and see whether it's valid.
- **Algorithms**: HMAC (`HS256`/`384`/`512`), RSA (`RS`/`PS256`/`384`/`512`), ECDSA (`ES256`/`384`/`512`), and unsecured `none`.
- **Base64-encoded secret** toggle for HMAC keys.
- Loads a JWT from your clipboard automatically when you open the command.

## Privacy

Everything runs locally. Your tokens, secrets, and keys never leave your machine — unlike pasting them into a website.

## Keys

- **HMAC (HS\*)**: enter the shared secret. Toggle "Secret is Base64 encoded" if your secret is Base64.
- **RSA / ECDSA (RS/PS/ES\*)**: paste a PEM **private key** to sign and a PEM **public key** to verify.
