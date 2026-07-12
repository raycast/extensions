# Security Policy

## Supported versions

Until the first tagged release is published, security fixes target the `main`
branch.

## Reporting a vulnerability

Please do not open a public GitHub issue for suspected vulnerabilities involving
API keys, prompt injection, provider request handling, local file exposure, or
private selected text.

Report privately through GitHub Security Advisories for this repository. Include:

- affected WordingKit version or commit;
- provider and mode configuration involved;
- steps to reproduce;
- whether selected text, API keys, or provider responses may be exposed;
- screenshots or logs with secrets removed.

## Handling secrets

WordingKit API keys belong in Raycast Preferences. Do not put keys in source
files, `.env` files committed to Git, screenshots, issue reports, evaluation
messages, or logs.

Provider errors shown to users are expected to redact configured API keys as
`[REDACTED]`. Treat any regression in that behavior as security-sensitive.
