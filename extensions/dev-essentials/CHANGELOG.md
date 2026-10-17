# Dev Essentials Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Generate UUID: create UUID v4 (default) or v7, show it with alternative formats and copy it to the clipboard
- Convert Timestamp: show the current Unix timestamp, or convert Unix timestamps (s/ms/µs/ns, auto-detected or chosen explicitly), ISO 8601 date-times, relative durations ("10 seconds ago", "in 2 hours") and natural-language dates
- Decode JWT / JWS: decode header, payload and claims, verify signatures (secret, PEM, JWK, JWKS or JWKS URL) and sign new tokens
- Decode JWE: inspect protected headers, decrypt (including nested JWTs) and encrypt tokens
