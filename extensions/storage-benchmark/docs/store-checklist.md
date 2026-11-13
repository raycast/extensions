# Raycast Store submission checklist

## Completed locally

- [x] Public extension manifest uses the MIT license and restricts the extension to macOS.
- [x] Two commands build: **Run Storage Benchmark** and **View Storage History**.
- [x] 512×512 PNG Store icon is present.
- [x] README explains setup, methodology, cleanup, permissions, privacy, and limitations.
- [x] No analytics, telemetry, network requests, credentials, or Keychain access.
- [x] Native benchmark source and tests are included under `native/DiskSpeedHelper`.
- [x] Raycast's Swift tooling compiles the `DiskSpeedHelper` executable from source during `ray build`.
- [x] Swift dependencies are pinned in `native/DiskSpeedHelper/Package.resolved`; no precompiled executable is committed.
- [x] The TypeScript engine invokes the generated `swift:` bridge without shell commands or downloaded code.
- [x] Temporary files use mode `0600`, an exact private UUID pattern, and cleanup on success/error/cancellation.
- [x] Defensive stale cleanup ignores unrelated files and symlinks.
- [x] Low-space validation happens before allocation or file creation.
- [x] Permission denial returns a structured error without an abandoned file.
- [x] Abort creates a private cancellation marker; the native process also handles Raycast termination signals.
- [x] Malformed/unsupported native protocol records are rejected.
- [x] Local history is bounded, version-compatible, and keeps diagnostics separate.
- [x] Raycast source-built Swift progress, result, and history recording were smoke-tested in development mode on 2026-08-26.
- [x] 16 Swift tests, 41 TypeScript tests, typecheck, Raycast lint, and the Raycast distribution build pass.
- [x] Initial Store changelog is present.
- [x] Raycast Support recommended the built-in Swift compiler on 2026-08-26; the extension now follows the referenced Color Picker pattern.

## Required before public PR

- [x] Confirm the Raycast Store username is `ricoloic` and matches the manifest author.
- [x] Authenticate the Raycast CLI as `ricoloic` before publishing.
- [x] Recapture the five 2000×1250 Store screenshots with the **Storage Benchmark** UI, using crop-only exports with no visual effects.
- [x] Repeat calibration on an external ExFAT NVMe SSD.
- [x] Record that internal-versus-external ordering and repeatability are sensible; do not require numerical equivalence to another benchmark.
- [x] Repeat the author's manual testing after the rebrand and complete any resulting extension adjustments.
- [x] Obtain explicit user approval before running `npm run publish` or opening a new public pull request.

## Optional follow-up validation

- [ ] Repeat calibration on representative slower removable storage when that hardware is available.
