# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security bugs seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: [security@tomjohndesign.com](mailto:security@tomjohndesign.com)

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

Please include the following information in your report:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

After you submit a report, we will:

1. Confirm receipt of your vulnerability report within 48 hours
2. Provide regular updates about our progress
3. Credit you in our security advisories (unless you prefer to remain anonymous)

### Security Considerations

This extension processes video files using FFmpeg, which involves:

- **File System Access**: The extension reads and writes video files
- **External Process Execution**: FFmpeg is executed as a subprocess
- **User Input Validation**: File paths and speed values are validated
- **Temporary Files**: May create temporary files during processing

### Known Security Considerations

- **FFmpeg Dependency**: This extension relies on FFmpeg being installed on the user's system. We recommend users install FFmpeg from official sources.
- **File Path Validation**: All file paths are validated to prevent directory traversal attacks
- **Input Sanitization**: Speed values are validated to be within acceptable ranges
- **Process Execution**: FFmpeg is executed with limited permissions and validated arguments

### Best Practices for Users

1. **Install FFmpeg from Official Sources**: Use Homebrew (`brew install ffmpeg`) or download from [ffmpeg.org](https://ffmpeg.org/download.html)
2. **Keep FFmpeg Updated**: Regularly update FFmpeg to get security patches
3. **Validate Input Files**: Only process video files from trusted sources
4. **Monitor File Permissions**: Ensure the extension has appropriate file system permissions

### Security Updates

Security updates will be released as patch versions (e.g., 1.0.1, 1.0.2) and will be announced in:

- GitHub releases
- The project's README
- Security advisories (for critical issues)

### Disclosure Policy

- We will provide credit to security researchers who responsibly disclose vulnerabilities
- We will not pursue legal action against researchers who follow responsible disclosure practices
- We will work with researchers to understand and resolve security issues

### Contact

For security-related questions or concerns, please contact us at [security@tomjohndesign.com](mailto:security@tomjohndesign.com).

Thank you for helping keep Turbo Speedo Video and our users safe!
