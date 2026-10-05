# Security Policy

## Supported versions

The latest state of the default branch is the only actively supported version while the project is in early development.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting or a private Security Advisory. Do not open a public issue for a suspected vulnerability.

If private reporting is not enabled on the repository, contact the maintainer through a private channel listed on the maintainer's GitHub profile. Please include:

- a concise description of the issue;
- affected files or versions;
- reproduction steps that do not contain real credentials or personal data;
- an assessment of potential impact.

Please allow reasonable time for investigation and a fix before public disclosure.

## Secret handling

The current extension does not require API keys or environment variables. Translation text is sent to Google's public endpoint and Russian proofreading text is sent to LanguageTool's public API, so confidential data should not be submitted through either provider.

If a credential is ever committed accidentally, revoke or rotate it first. Removing the file does not invalidate a secret that is already present in Git history.
