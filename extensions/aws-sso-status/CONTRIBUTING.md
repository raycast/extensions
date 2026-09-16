# Contributing

Use fictional profiles and account IDs in fixtures and screenshots. Never commit AWS config, tokens, credentials, or real diagnostic output.

Before opening a pull request:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Keep AWS operations separate from UI, retain safe argument arrays and sanitized errors, and keep the Store interface in US English. Changes to session coordination must test independent role resolution, concurrent requests, backoff, and failure recovery. Update README and CHANGELOG for user-visible changes.

Native Raycast behavior should be verified on macOS. Automated tests use temporary fake executables and must not depend on a developer's AWS account.
