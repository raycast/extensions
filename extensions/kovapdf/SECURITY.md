# Security

Please report a security problem in this package, or in KovaPDF itself, to
**support@kovapdf.com** (the contact in https://www.kovapdf.com/.well-known/security.txt).
How we handle files, encryption and reports: https://www.kovapdf.com/security

Please do not open a public issue for a security problem. Tell us what you
found and how to reproduce it; we answer as soon as we can.

## How this extension handles your key

- The API key is a Raycast password preference; Raycast stores it. The
  extension never writes it to disk or logs it.
- The key is only sent to https://api.kovapdf.com, over https.
- Result download links need no key, and the key is never sent to them.
