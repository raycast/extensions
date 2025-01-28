# Security Policy

## Known Vulnerabilities

As of January 2025, our dependency audit shows several vulnerabilities in development dependencies. These are primarily stemming from `@raycast/api` and its development toolchain.

### Current Status

We have 12 identified vulnerabilities:
- 8 High severity
- 4 Moderate severity

### Why We Accept These Risks

1. **Development-Only Impact**
   - All identified vulnerabilities are in development dependencies
   - These dependencies are not included in the production build
   - They only affect developers working on the codebase, not end users

2. **Raycast Extension Requirements**
   - We use `@raycast/api@^1.88.4` which is required for Raycast extension development
   - The vulnerabilities come from this package's development dependencies
   - Modifying these dependencies could break the extension's development workflow

3. **Core Dependencies**
   Our production dependencies are minimal and secure:
   - `@raycast/api`: Required by Raycast
   - `node-fetch`: Modern, secure HTTP client

### Mitigation

1. These vulnerabilities do not affect the published extension or end users
2. Development is done in controlled environments
3. We regularly monitor for updates from Raycast that might address these issues

### Reporting New Vulnerabilities

If you discover a security vulnerability that affects the runtime behavior of the extension (not development dependencies), please:
1. Open a security advisory on our GitHub repository
2. For critical issues, contact the maintainers directly

We will assess and respond to security reports that affect production functionality with high priority.
