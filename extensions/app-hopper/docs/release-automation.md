# CI and companion release automation

## CI

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests and manual dispatch. It uses a standard macOS runner with Node 24. No signing credentials are passed to CI. It prepares ad-hoc universal native helpers and the Raycast extension, checks types/lint/tests, verifies helper artifacts and tracked Store metadata/screenshots, and uploads unsigned companion and reviewer-source ZIPs for seven days. Valid bundled helpers are reused; stale or missing helpers are rebuilt.

CI does not grant macOS Accessibility permission or validate live browser UI, installed-extension behavior, Developer ID signing, notarization or Raycast Store acceptance. Those require separate acceptance.

## Configure signing

In repository **Settings → Secrets and variables → Actions**, configure:

- `WEB_EXT_API_KEY`: Mozilla JWT issuer.
- `WEB_EXT_API_SECRET`: Mozilla JWT secret.

These credentials belong to the Mozilla account that owns `app-hopper-firefox@chenghsj`. The workflow exposes them only to the Mozilla signing step; do not put their values in source, inputs or logs. GitHub's built-in token publishes the release and updates the pinned download configuration; no GitHub personal token is required.

## Run a release

1. Commit and push a higher `version` in `companion/manifest.json` to `main`; let CI pass.
2. Open **Actions → Sign and release companion → Run workflow**, on `main`.
3. Leave **Build only** enabled to validate the current package without signing. Disable it to submit a new version. Leave **Publish GitHub Release** enabled for a full release, or disable it for sign-only testing.

A signing run rejects versions equal to or older than the configured release, and refuses an existing GitHub Release. It builds with pinned web-ext, submits the extension and matching TypeScript source ZIP using `--channel unlisted`, and waits up to 15 minutes for Mozilla approval. It checks the returned manifest, background bytes, signature metadata and unexpected files before publishing `companion-v<VERSION>` at the triggering commit.

The Release contains the signed XPI, reviewer source ZIP and SHA256SUMS. The workflow downloads the XPI without credentials, verifies its checksum, and commits the new URL/version/hash to `assets/companion-integration.json`. Rebuild/distribute App Hopper afterward so its users receive the new pin. The workflow does not publish the Raycast extension, import Apple certificates or perform notarization.

## Failures and recovery

`scripts/companion-release-artifacts.ts` owns local XPI inspection, release-file preparation and manual pinning. Both paths check identity, version and signature metadata; CI additionally requires the exact built manifest/background and rejects unexpected files. `tests/companion-artifacts.test.ts` exercises both policies with real ZIP fixtures. The workflow continues to own Mozilla submission, GitHub publication, anonymous-download verification and the final Git push.

- Build-only success proves build/lint/workflow behavior; it does not authenticate the Mozilla credentials or prove real signing.
- If Mozilla requires manual review or the approval wait times out, check the existing submission in the Mozilla Developer Hub. Do not blindly resubmit that same version or start concurrent signing. Download the signed file when it becomes available and follow the manual release instructions in [Firefox integration](firefox-integration.md#release).
- Artifacts, including any returned signed XPI, are retained for 14 days even on later failures. Do not replace an existing published XPI under the same version.
- If publication succeeds but pinning fails (for example `main` advanced or branch protection blocks the bot push), the Release remains published. Update the shared configuration with `configure:companion-release`, review and commit it; do not rerun signing.
- Browser installation remains the cryptographic signature verifier. The workflow's file-content and signature-metadata checks do not replace that browser verification.

References: [Mozilla web-ext sign](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-sign), [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).

## Sign-only acceptance test

Set **Build only** to false and **Publish GitHub Release** to false. This makes a real Mozilla submission, consumes that manifest version, downloads the signed XPI, and validates its content. The signed package, reviewer source and checksums are saved as the workflow artifact. No GitHub Release is created and the repository download pin is unchanged.

A signed test version cannot be submitted again under the same version number. To publish it afterward, download the verified artifact and publish that same XPI through the manual release flow; do not run the signing submission again.
