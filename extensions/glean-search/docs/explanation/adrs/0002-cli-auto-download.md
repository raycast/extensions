---
status: accepted
date: 2026-06-26
decision-makers: faizhasim
---

# CLI Auto-Download over Bundling

## Context and Problem Statement

The extension needs the Glean CLI to communicate with the Glean API. How should the CLI binary be distributed to users?

Options include bundling the binary with the extension, requiring users to install it manually, or downloading it automatically on first use.

## Decision Drivers

- The extension should work out of the box without manual setup steps
- The extension package (`.raycast` archive) should stay small — the Glean CLI binary is approximately 30 MB
- The CLI is updated independently by Glean; users should get updates without needing to reinstall the extension
- The solution should be reliable across platforms (macOS primary, Linux secondary)
- The binary must be verified to prevent tampering or corruption

## Considered Options

- **Auto-download from GitHub Releases** — download the latest CLI binary on first launch, with SHA-256 verification
- **Bundle the binary** — include the CLI binary in the extension package
- **Manual install only** — require users to install the CLI via Homebrew or another package manager
- **System discovery with auto-download fallback** — check for an existing system install first, then auto-download if not found

## Decision Outcome

Chosen option: **System discovery with auto-download fallback**, because:

- It provides the best user experience: zero manual steps for most users
- If a user already has the CLI installed (e.g., via Homebrew), the extension uses it immediately
- The auto-download path includes SHA-256 verification for security
- The binary is cached and only downloaded once
- The extension package stays small

### Consequences

- Good, because first-time setup is seamless for users
- Good, because users who already manage the CLI via Homebrew see no change in behaviour
- Good, because CLI updates are picked up independently of extension updates
- Good, because SHA-256 verification protects against corrupted or tampered downloads
- Bad, because the first launch requires network access and may take a few seconds
- Bad, because the download logic adds complexity to the codebase (retry, error handling, cache invalidation)
- Neutral, because users on restricted networks may need to install the CLI manually — the extension supports this via system discovery

### Confirmation

The auto-download is implemented in `src/lib/cli.ts`. The binary is cached in Raycast's support directory alongside a metadata file (`cli-info.json`) tracking the version and checksum. Download failures are persistently marked to avoid repeated failed attempts on every launch.

## Pros and Cons of the Options

### Auto-download from GitHub Releases

Download the latest Glean CLI release from GitHub on first launch.

- Good, because the extension package stays small
- Good, because users always get the latest CLI version
- Good, because SHA-256 verification provides tamper protection
- Neutral, because the download adds latency to first launch
- Bad, because the download may fail on networks that block GitHub

### Bundle the binary

Include the CLI binary in the extension's `assets/` directory and ship it with every release.

- Good, because there is no network dependency on first launch
- Good, because the version is pinned and tested with the extension
- Bad, because the extension package becomes approximately 30 MB larger
- Bad, because updating the CLI requires a new extension release
- Bad, because Raycast Store reviews may flag large binaries

### Manual install only

Require users to install the CLI via `brew install gleanwork/tap/glean-cli` or a similar method.

- Good, because the extension code is simpler with no download logic
- Good, because users control when to update the CLI
- Bad, because it creates a manual setup step, degrading the out-of-box experience
- Bad, because users who do not use Homebrew need to find alternative installation methods

### System discovery with auto-download fallback

Check common system locations (`PATH`, Homebrew prefix, `/usr/local/bin`) first, then fall back to auto-download if no binary is found.

- Good, because it combines the best of both approaches: existing installs are honoured, new users get auto-setup
- Good, because the auto-download path is an implementation detail users never need to think about
- Bad, because the resolution logic is more complex than any single approach
- Neutral, because the system check adds negligible latency (file existence checks only)
