# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Prompt Pocket seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please do NOT:

- Open a public GitHub issue
- Disclose the vulnerability publicly before it has been addressed

### Please DO:

1. **Report via GitHub Security Advisories** (Preferred)
   - Go to the [Security tab](https://github.com/marty-martini/raycast-prompt-pocket/security/advisories) of this repository
   - Click "Report a vulnerability"
   - Fill in the details of the vulnerability

2. **Contact the maintainers directly**
   - You can reach out to the maintainers directly through GitHub discussions (mark as private/security-related if possible)

### What to include in your report:

- Type of vulnerability
- Full paths of source file(s) related to the manifestation of the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to expect:

- **Initial Response**: We will acknowledge your report within 48 hours
- **Investigation**: We will investigate the issue and may ask for additional information
- **Fix Timeline**: We aim to release a fix within 90 days for high-severity issues
- **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous)
- **CVE**: For significant vulnerabilities, we will request a CVE identifier

## Security Best Practices for Users

When using Prompt Pocket:

1. **Keep Updated**: Always use the latest version of the extension
2. **Review Permissions**: Understand what permissions the extension requires
3. **Data Privacy**: Be mindful of sensitive information in your prompts
4. **Backup**: Regularly backup your prompts if they contain important information

## Security Measures

We implement the following security measures:

- **Code Review**: All code changes go through peer review
- **Dependency Updates**: Automated dependency updates via Dependabot
- **CI/CD Pipeline**: Automated testing and linting on all pull requests
- **Static Analysis**: Code quality and security checks
- **Minimal Permissions**: Extension requests only necessary permissions

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release new versions as soon as possible
5. Publish a security advisory on GitHub

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.

## Attribution

This security policy is adapted from the [GitHub Security Policy template](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository).

