# Roadmap

## Next (Short Term)

- Verify final command naming/copy in Raycast Store review.
- Publish to Raycast Store (`npx ray publish` from a `raycast/extensions` fork).

## Medium Term

- Add encrypted export/backup command.
- Add encrypted import/restore command.
- Improve account organization (tags/groups/search helpers).

## Security/UX Exploration

- Evaluate optional runtime master-password prompt with memory-only cache.
- Reassess threat tradeoff vs current Keychain-backed preference model.

## Nice-to-Have

- Better onboarding hints inside commands.
- Optional integrity checks for imported payloads.

## Done

- Repository metadata in `package.json` (`repository`, `bugs`, `homepage`).
- Screenshots in README (`metadata/local-2fa-*.png`).
- Minimal CI workflow (`.github/workflows/ci.yml`: lint + test + build).
- Multi-language READMEs (`docs/i18n/`: es, pt-BR, de, fr).
- KDF hardened to 600,000 PBKDF2 iterations (v2 payload, v1 backward-compat).
- Write-race mutex + corruption guard + derived-key cache.
- ESLint 9 flat config migration.
