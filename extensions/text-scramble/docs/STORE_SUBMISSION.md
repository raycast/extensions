# Raycast Store Submission

## Ready

- Manifest author matches the Raycast username: `kumail_changezi`
- MIT license and public source
- Latest Raycast API
- 512 × 512 PNG icon
- Plain-text, local-only runtime with no network access
- README, changelog, credits, security policy, and committed lockfile
- Automated tests, lint, build, and moderate-or-higher dependency audit in CI

## Before submission

1. Sign the CLI into the same Raycast account with `npx ray login` if needed.
2. Capture up to six optional Store screenshots. Raycast recommends at least three, each 2000 × 1250 PNG, showing only Raycast UI on a consistent background.
3. Run the complete verification suite:

   ```bash
   npm ci
   npm test
   npm run lint
   npm run build
   npm audit --audit-level=moderate
   ```

4. Submit with `npm run publish`. The Raycast CLI creates a pull request in `raycast/extensions` for review.

After the pull request is merged, Raycast publishes the extension to the Store automatically.
