<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="jwt-logger" width="100"/>
    <h3>jwt-decoder</h3>
    <p>Decode your JWT tokens</p>
    <br/>
    <br/>
</div>

Decode Your JSON Web Tokens – extract the header and payload from any JWT you have copied to your clipboard.

## Commands

### View Decoded JWT

Opens a detail view that renders the raw token alongside its decoded header and payload. Use the action panel to copy the full Payload JSON, the full Header JSON, or any individual field value. Toggle the metadata sidebar with **Show Key** / **Hide Key**.

### Search Decoded JWT

Opens a searchable list grouped by **HEAD: ALGORITHM & TOKEN TYPE** and **PAYLOAD: DATA**. Every field is shown with its human-readable claim description (e.g. `iat` → _Issued at_). Toggle the detail pane to see the token highlighted inline while you browse.

### JWT Debugger

A token.dev-style workbench that goes beyond decoding: edit the header, payload, signing key, or algorithm and the JWT is **re-signed live**; paste a JWT and it decodes. Everything runs on-device.

- **Encode / edit & re-sign** and **verify** signatures with a live valid / invalid / unsigned status shown in the title bar.
- **Algorithms**: HMAC (`HS256/384/512`), RSA (`RS`/`PS256/384/512`), ECDSA (`ES256/384/512`), and unsecured `none`. Switching algorithm loads a matching example key so it stays a working sample.
- Base64-encoded secret toggle for HMAC; PEM private/public keys for asymmetric algorithms.
- **JWKS endpoint**: for RS/ES, toggle _Use JWKS Endpoint_ to verify against a remote JWKS URL instead of a pasted public key.
- **Key profiles**: save the current key material (algorithm, secret, PEM keys, or JWKS URL) under a name and load it later.
- Changing a signing key (HMAC secret or private key) re-signs the token; a public key or JWKS only verifies. Use **Sign / Re-Sign with Current Key** to force a re-sign.

## Usage

1. Copy a JWT to your clipboard.
2. Open Raycast and run **View Decoded JWT**, **Search Decoded JWT**, or **JWT Debugger**.
3. The token is decoded automatically — no API keys or configuration required. In **JWT Debugger** you can also edit, re-sign, and verify it.

## Platforms

macOS · Windows
