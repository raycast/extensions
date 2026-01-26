# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the Dex CRM Raycast Extension, please report it by emailing the repository owner directly. **Do not** create a public GitHub issue for security vulnerabilities.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Best Practices

### API Key Storage

- API keys are **never** stored in code
- Keys are stored securely in Raycast's preferences system
- Use password-type fields for sensitive data
- Never commit `.env` files or files containing API keys

### Code Security

- All dependencies are regularly updated
- ESLint rules enforce secure coding practices
- No use of `eval()` or dangerous dynamic code execution
- Input sanitization on all user inputs
- HTTPS-only communication with Dex API

### Testing Security

- Test files use mock API keys only
- Integration tests require `DEX_API_KEY` environment variable
- Never hardcode real API keys in test files

### Local Development

1. **Never commit sensitive data**:
   - Use `.env` for local API keys (already in `.gitignore`)
   - Use environment variables for CI/CD secrets
   - Review changes before committing

2. **Pre-commit checks**:
   - Husky hooks prevent accidental commits of sensitive data
   - Lint-staged runs on all staged files
   - ESLint catches potential security issues

3. **Dependency security**:
   ```bash
   npm audit          # Check for vulnerabilities
   npm audit fix      # Auto-fix vulnerabilities
   ```

## Known Security Measures

### Implemented

- ✅ API key stored in Raycast preferences (encrypted)
- ✅ HTTPS-only API communication
- ✅ No sensitive data in logs
- ✅ Input validation on all forms
- ✅ ESLint security rules enabled
- ✅ Dependency vulnerability scanning in CI
- ✅ Pre-commit hooks to catch sensitive data

### Best Practices for Users

1. **Protect Your API Key**:
   - Never share your Dex API key
   - Rotate keys if compromised
   - Use unique keys per device/environment

2. **Keep Extension Updated**:
   - Update to latest version for security patches
   - Monitor security advisories

3. **Report Issues**:
   - Report suspicious behavior immediately
   - Check extension permissions regularly

## Security Checklist for Contributors

Before submitting a PR:

- [ ] No API keys or secrets in code
- [ ] No hardcoded credentials
- [ ] All user inputs validated
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies up to date
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Tests don't expose real API keys

## Incident Response

In case of a security breach:

1. **Immediate**: Revoke compromised API keys at https://app.getdex.com/settings/integrations
2. **Report**: Contact repository maintainer
3. **Update**: Install patched version when available
4. **Monitor**: Watch for suspicious activity in your Dex account

## Contact

For security concerns, please contact the repository owner directly.

**Response Time**: We aim to respond to security reports within 48 hours.

---

Last updated: January 26, 2026
