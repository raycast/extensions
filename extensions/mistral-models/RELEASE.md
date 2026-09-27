# Release checklist

## Build

1. Install dependencies from the submitted npm lockfile:

   ```sh
   npm ci
   ```

2. Run the release checks:

   ```sh
   bun run release:check
   ```

3. Check dependencies for known vulnerabilities:

   ```sh
   npm audit
   ```

The release checks stop on failure and build into `dist/`. They do not install or publish the build. The audit requires network access and checks dependency advisories, not application security.

Raycast Store CI uses `package-lock.json`. After dependency changes, update it with `npm install --package-lock-only --ignore-scripts`. Verify it with `npm ci` before submission. Bun runs local scripts and tests. The local `bun.lock` does not ship in the Store submission.

## Live tests

Automated tests mock HTTP requests. Load the extension with `bun run dev` for local checks. Before submission, also test the distribution build in Raycast. Use your own API key and expect API charges.

- Preferences show one required password field and retain existing keys.
- Refresh lists latest chat models without duplicate names, Codestral, or Voxtral.
- AI Chat completes an answer and uses earlier messages correctly.
- A model with image support accepts an image.
- A model with tool support completes a tool request without duplicate execution.
- Canceling stops the response, and the next prompt works.
- Missing or invalid credentials produce a useful error without exposing the key.

The recovery tests cover interrupted streams. A normal live answer does not test every recovery path.

## Store submission

1. Check the author account, `m1n`.
2. Review the README, help, changelog, and icon attribution in `assets/README.md`.
3. Confirm logo distribution rights and retain required license notices.
4. Add screenshots or a screencast without credentials or private chat content.
5. Run the release checks against the source for submission.
6. With publishing approval, run `bun run publish`.
7. Complete the PR description and record the test results.
8. Mark the PR ready for review after live testing and screenshots are complete.

Never submit API keys, personal chat logs, `.env` files, or local Raycast settings. The README describes the data sent to Mistral.
