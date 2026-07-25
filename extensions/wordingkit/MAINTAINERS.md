# Maintainers

## Current maintainers

- [@suregoodru](https://github.com/suregoodru)

## Maintainer responsibilities

- Keep the default branch buildable with `npm test`, `npm run lint`, and
  `npm run build`.
- Review provider changes for privacy, secret handling, and prompt behavior.
- Keep issue templates, security policy, and contribution docs current.
- Triage security-sensitive reports privately before public disclosure.
- Prefer small, reviewable pull requests over broad rewrites.

## Release responsibilities

Until the first tagged release is created, the `main` branch is the supported
development line. Releases should include a changelog entry, a git tag, and the
same verification commands used in CI.
