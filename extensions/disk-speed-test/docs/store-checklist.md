# Raycast Store submission checklist

## Completed locally

- [x] Public extension manifest uses the MIT license and restricts the extension to macOS.
- [x] Two commands build: **Run Disk Speed Test** and **View Disk Speed History**.
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
- [x] Raycast Store username is confirmed as `cetrus7`.
- [x] Raycast Support recommended the built-in Swift compiler on 2026-08-26; the extension now follows the referenced Color Picker pattern.
- [x] Five Store screenshots are present as 2000×1250 PNG files, show the current release UI, and are crop-only exports of the supplied originals with no visual effects.

## Required before public PR

- [x] Authenticate the Raycast CLI as `cetrus7` before publishing.
- [x] Repeat calibration on an external ExFAT NVMe SSD.
- [x] Record that internal-versus-external ordering and repeatability are sensible; do not require numerical equivalence to another benchmark.
- [x] Complete the author's manual testing and resulting extension adjustments.
- [x] Obtain explicit user approval before running `npm run publish` or opening a public pull request.

## Optional follow-up validation

- [ ] Repeat calibration on representative slower removable storage when that hardware is available.
