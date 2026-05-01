# Secure Redact

**100% offline data redaction for sensitive information.** Detects 26+ signatures (API keys, JWTs, credit cards, SSNs, IBANs, crypto addresses, IPs, paths, and more) and rewrites them in one of four modes before you paste into AI tools, GitHub tickets, logs, or emails. Detection is pure regex + checksum validation (Luhn, IBAN mod-97, VIN). **No AI model. No cloud. No telemetry.**

## Commands

| Command          | Description                                  | Recommended Hotkey |
| ---------------- | -------------------------------------------- | ------------------ |
| Redact Clipboard | Sanitize clipboard content in place          | ⌥⇧R                |
| Redact & Paste   | Sanitize and paste to active app             | ⌥⇧V                |
| Open Workbench   | Interactive editor with live preview         | —                  |
| Audit Log        | View redaction history (stats only)          | —                  |
| Threat Feeds     | Manage custom regex patterns                 | —                  |
| Settings         | Manage local data and view privacy details   | —                  |

## Detection Coverage

Coverage scales with the selected detection policy. Default: **Balanced**.

| Policy   | Includes                                                         |
| -------- | ---------------------------------------------------------------- |
| Secrets  | API keys, JWTs, passwords, sessions, DB strings, PEM keys        |
| Balanced | Secrets + emails, phones, SSNs                                   |
| Standard | Balanced + credit cards, IBANs, SWIFT, BTC/ETH/LTC/XMR addresses |
| Enhanced | Standard + IPv4/IPv6, MAC, UUID, URLs, Unix/Windows paths, VIN   |

### Patterns

**Secrets** — JWT, AWS access key, GitHub PAT, Stripe key, Google API key, password fields, database URLs (Postgres/MySQL/MongoDB), PEM private keys, generic session tokens.

**Personal** — Email, US phone numbers, SSN (with area-code validation).

**Financial** — Credit cards (Luhn-validated), IBAN (mod-97), SWIFT/BIC, Bitcoin, Ethereum, Litecoin, Monero.

**Network & System** — IPv4, IPv6, MAC, HTTP/HTTPS URLs, UUID, Unix paths, Windows paths, VIN (check-digit validated).

## Modes

### Label
Generic placeholder for every match.
```
Input:  Contact john.doe@company.com for AKIAIOSFODNN7EXAMPLE
Output: Contact [REDACTED] for [REDACTED]
```

### Typed (default)
Type-specific placeholders.
```
Input:  Contact john.doe@company.com for AKIAIOSFODNN7EXAMPLE
Output: Contact [EMAIL_REDACTED] for [AWS_ACCESS_KEY_REDACTED]
```

### Indexed
Stable per-value tokens — same input → same token.
```
Input:  Email john.doe@company.com and cc john.doe@company.com
Output: Email [EMAIL_1] and cc [EMAIL_1]
```

### Masked
Preserves shape, hides core.
```
Input:  Contact john.doe@company.com, card 4539 1488 0343 6467
Output: Contact jo***@***.com, card ****-****-****-6467
```

## Privacy

Secure Redact makes zero network calls and stores no input or output text.

**Stored locally (Raycast LocalStorage):**
- `secure-redact.audit.v1` — aggregate redaction stats, capped at 500 entries
- `secure-redact.feeds.v1` — user-defined custom patterns

**Never stored:** original text, redacted output, clipboard contents, file metadata, or network activity.

## Hotkeys

Configure in Raycast Preferences → Extensions → Secure Redact:

- **⌥⇧R** → Redact Clipboard
- **⌥⇧V** → Redact & Paste

## Limitations

- Pattern-based detection has known limits — review output before sharing.
- Not a compliance tool. GDPR / HIPAA / PCI DSS require additional controls.
- Checksum validation reduces false positives but does not eliminate them.
- Custom threat feeds require careful regex construction to avoid catastrophic backtracking.

## License

MIT
