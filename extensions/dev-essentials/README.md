# Dev Essentials

[![CI](https://github.com/vinh0604/raycast-devutils/actions/workflows/ci.yml/badge.svg)](https://github.com/vinh0604/raycast-devutils/actions/workflows/ci.yml)

Everyday developer utilities for Raycast: UUIDs, Unix timestamps, and JWT / JWS / JWE tokens.

| Command | Usage | What it does |
| --- | --- | --- |
| **Generate UUID** | `uuid`, `uuid v7` | Generates a UUID (v4 by default, or v7), shows it, and copies it. Includes uppercase, no-dash, URN and brace formats, plus the embedded timestamp for v7. `⌘R` makes a new one, `⌘T` switches version. |
| **Convert Timestamp** | `ts` | Live current time as Unix seconds/ms, ISO 8601 (UTC and local), HTTP date and relative time. |
| | `ts 1700000000` | Unix timestamp → date. Seconds, milliseconds, microseconds and nanoseconds are detected by digit count. |
| | `ts 10 seconds ago`, `ts 1 day ago`, `ts in 2h`, `ts +1h30m` | Relative durations. |
| | `ts 2024-01-01T09:30:00+07:00` | ISO date-time (also natural language such as `yesterday 5pm`). |
| **Decode JWT** | `jwt <token>` or `jwt` | Decode (header, payload, claims with exp/nbf status), verify, and encode/sign. |
| **Decode JWS** | `jws <token>` or `jws` | Same as JWT, but the payload can be any text. |
| **Decode JWE** | `jwe <token>` or `jwe` | Inspect the header, decrypt (shows nested JWTs), and encrypt. |

Run with no token, the Decode JWT/JWS/JWE commands open a menu and offer any token found on the clipboard.

**Keys:** you can enter a shared secret (UTF-8, Base64, Base64URL or hex), a PEM (SPKI/PKCS#8/PKCS#1/SEC1 key or X.509 certificate), a JWK, a JWKS, or, for verification only, a JWKS URL. If you give a private key where a public key is needed, the public key is derived from it. Press `⌘G` in the sign/encrypt forms to generate a matching key or key pair.

Tip: set Raycast aliases (`uuid`, `ts`, `jwt`, …) in Raycast Settings → Extensions so you can type the alias followed by the argument.

## Development

```sh
npm install
npm run dev     # load into Raycast with hot reload
npm test        # unit tests (vitest)
npm run lint    # ESLint, Prettier and Raycast Store validation
npm run publish # submit to the Raycast Store
```

## License

[MIT](LICENSE)
