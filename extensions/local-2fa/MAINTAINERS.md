# Maintainers Guide

Internal guide for maintaining and publishing `local-2fa`.

## Scope Boundaries

User-facing docs:

- `README.md` (+ translations in `docs/i18n/`)
- `SECURITY.md`
- `CHANGELOG.md`

Maintainer docs:

- `MAINTAINERS.md` (this file)
- `ROADMAP.md`

## Non-Negotiable Technical Boundaries

The crypto core must not be changed casually:

- `src/storage.ts`
- `src/totp.ts`
- `src/google-migration.ts`

Any changes here require:

1. explicit rationale
2. updated tests
3. threat-model review in `SECURITY.md`

## Quality Gate Before Release

```bash
npm run lint
npm test
npm run build
```

All must pass.

## Raycast/Tooling Notes

- Raycast lint enforces strict Title Case. Three cosmetic warnings are
  accepted intentionally for readability (lint still exits 0):
  - extension title: `Local 2FA Codes` (lint expects `Local 2fa Codes`)
  - command title: `Import from QR Image` (lint expects `Import from Qr Image`)
  - action title in `import-from-qr-image.tsx` line ~125
- Keep `2FA` and `QR` uppercase in user-facing copy.

## Known Non-Blocking Warning

`[DEP0040] punycode` deprecation warning can appear in dev tooling.
Current source is transitive tooling deps (eslint/ajv/uri-js).
Treat as non-blocking unless it becomes a runtime issue.

## Test Data (Development)

Demo `otpauth://` payload to validate import/generation flows locally:

```text
otpauth://totp/Demo:user@example.io?secret=JBSWY3DPEHPK3PXP&issuer=Demo&period=30&digits=6&algorithm=SHA1
```

Optional: generate a local PNG QR image for `Import from QR Image`:

```bash
brew install qrencode
echo 'otpauth://totp/Demo:user@example.io?secret=JBSWY3DPEHPK3PXP&issuer=Demo&period=30&digits=6&algorithm=SHA1' \
  | qrencode -o /tmp/local-2fa-demo.png
```

Never use demo/shared secrets in real accounts.

## Translations

Translated READMEs live in `docs/i18n/`:

- `README.es.md`
- `README.pt-BR.md`
- `README.de.md`
- `README.fr.md`

When updating `README.md`, propagate changes to all translations. Use DeepL
for editorial-quality translation; keep technical terms (`AES-256-GCM`,
`PBKDF2`, `otpauth://`, `Raycast`, command names) untouched.

## Publishing Checklist

### To GitHub (public repo)

1. Confirm `metadata/` contains 1–6 screenshots (Window Capture in dev mode).
2. Run quality gate: `npm run lint && npm test && npm run build`.
3. Verify no personal data leaked: `grep -rn -E "(contacto@davidsitjes|/Users/)" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" .` (only `README.md`, `SECURITY.md` and `docs/i18n/*` should match — all for vulnerability reporting). No `/Users/` paths anywhere.
4. Tag release: `git tag vX.Y.Z && git push --tags`.

### To Raycast Store

1. Fork [`raycast/extensions`](https://github.com/raycast/extensions).
2. Copy the entire extension folder into `extensions/local-2fa/`.
3. Rename `[Unreleased]` to `[Initial Version] - YYYY-MM-DD` in CHANGELOG.md
   (Raycast Store convention).
4. From the fork root: `npx ray publish`. The CLI opens a PR with the right
   labels and reviewers.
5. Address review feedback. OTP/auth extensions tend to get stricter review —
   be explicit that everything is local-first.

## Store Positioning

This project is technically solid but OTP manager apps may receive stricter review.
Position clearly as local-first and security-conscious.
