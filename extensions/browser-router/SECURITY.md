# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Reporting a Vulnerability

The Browser Router team takes the security and integrity of our software seriously. If you discover a security vulnerability or potential threat within this extension, please practice responsible disclosure.

### How to Report
1. **GitHub Security Advisory**: Submit a private advisory via GitHub's "Security" tab if available on the repository.
2. **In-App Feedback**: Use the built-in feedback tool (<kbd>Ctrl</kbd> + <kbd>F</kbd>) with category "Bug Report" and mark "[SECURITY]" in the subject line.

Please include:
- A clear description of the vulnerability.
- Steps to reproduce or proof-of-concept code.
- Impact assessment.

We will review your submission promptly, validate the findings, and coordinate a patched release.

---

## Security Architecture & Design Guarantees

Browser Router enforces defense-in-depth engineering principles:

1. **Zero Shell Injection**:
   - Browser executables and target URLs are launched strictly through Node's child_process.spawn() with shell: false. Arguments are supplied as discrete array tokens, completely bypassing cmd.exe or powershell.exe command line interpretation.
2. **Credential Isolation**:
   - Browser Router never attempts to read, decrypt, or process browser cookies, DPAPI master keys, or saved passwords.
3. **Serverless Secret Protection**:
   - No sensitive third-party webhook tokens or developer keys are bundled into the client application. The feedback mechanism is proxied via a Cloudflare Worker where secrets remain encrypted in worker environment memory.