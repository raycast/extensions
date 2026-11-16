# Validation — 16 November 2026

## Completed

- Production Raycast build (`ray build -e dist`), TypeScript, ESLint, and Prettier checks.
- 13 regression tests covering URL/input validation, public address rules, response size and redirect limits, cancellation, PNG export and cleanup, deterministic rendering, weighted counts, all four surfaces and badge types, both themes, Show more, batch rendering, contact sheets, captured public-post resolution, and cache lifetime/capacity.
- Relocated production distribution: loaded the packaged WASM and bundled JavaScript dependencies outside the checkout, with network disabled and no access to the checkout's `node_modules`. Rendered a PNG and exercised draft create/update/read/delete, concurrent saves, base64 media persistence, and 50-draft retention.
- Installed a production build in Raycast and exercised native Create Post Preview → Detail, Save Draft history → Saved Drafts → reopened Detail, theme switching, Copy PNG (success toast), Save PNG (verified destination file), and the comparison gallery.
- Visually inspected multilingual and emoji PNG output. The Noto emoji bitmap conversion was necessary: unconverted CBDT fonts did not paint in Xeet. The checked-in build contains the corrected `sbix` derivative.
- Original 512 × 512 transparent PNG icon generated from `scripts/icon.svg`.

## AI tools and Windows update

- Registered eight AI tools with generated schemas, shared rendering/resolution/draft code, AI instructions, and 12 evals. All 12 Raycast AI evals passed with mocks; they verify selection and arguments, not live side effects.
- Executed all eight **compiled production tools** from a relocated distribution with spaces in its path. Checked PNG dimensions, every comparison dimension and a contact sheet, clipboard input, explicit save/copy output, saved preferences, draft edits preserving author/media, retry deduplication, deletion confirmation, and actual exported file bytes.
- Verified real tool results survive both `structuredClone` and JSON round trips without returning raw image payloads. Clipboard failures, unsupported options, ambiguous sources, malformed input, missing drafts, invalid preview IDs, and expired previews fail instead of reporting success.
- Added macOS/Windows CI, shell-independent test discovery, platform-specific shortcut definitions, File Explorer wording, and portable maintainer tool paths. Native Windows behavior and the remote CI matrix have **not** been executed in this session.

## Public X URL smoke checks

No cookies, account, third-party resolver, or test network bypass was used.

| URL                                             | Observed result                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `https://x.com/jack/status/20`                  | Resolved “just setting up my twttr”; no resolver warnings.                                           |
| `https://x.com/i/status/2119833829389041896`    | Resolved a public post beginning “The weekend ends. The mission keeps going.”; no resolver warnings. |
| `https://x.com/NASA/status/1740507890626453664` | X returned 404; the extension returned an actionable retry/text/JSON error.                          |

Live retrieval took approximately 0.9–1.9 seconds in this session. These observations are not a guarantee of future X availability. ID-based URL normalization uses the post ID and the resolved author, not a potentially incorrect handle from the pasted URL.

## Measurements and scope

An isolated Node process loaded the production open-font WASM in about 16 ms and rendered/wrote a common text preview in about 25 ms on this machine. These are renderer/file measurements with local OS caches, **not** end-to-end Raycast latency measurements. The full cold-start/form-display/clipboard performance targets from the PRD have not been benchmarked across supported hardware.

The standalone open-font WASM is approximately 49 MiB. All fonts are embedded; runtime rendering does not read the npm package's proprietary font assets or require downloads. Source revisions, font hashes, and the binary hash are recorded in `assets/xeet/provenance.json`.

`npm audit` currently reports seven moderate development-tool advisories in the TypeScript ESLint dependency chain through `minimatch`. A compatible `npm audit fix` did not resolve them. They are not part of the shipped extension's runtime dependencies.

## Remaining release steps

- Obtain Raycast Store review of the WASM artifact, source/build process, size, and bundled notices. No Store approval is claimed and nothing has been published.
- Capture final Store screenshots using Raycast's Capture Window command. The native testing screenshots were inspection evidence, not submission metadata. Suggested screens: composed preview, light/dark comparison, and Saved Drafts.
- Exercise native avatar selection, each comparison dropdown, contact-sheet export, and the Quick Render Clipboard command on the final packaged build. Their underlying render/storage/input paths have automated coverage; those individual native controls were not all exercised during this session.
- Run the new Windows CI job and exercise the five native commands, clipboard image transfer, avatar picker, directory picker, and File Explorer reveal on Windows. The manifest now supports macOS and Windows, with platform shortcuts and portable scripts. This session ran on macOS; no Windows runner or native Windows Raycast session was available.

The [Raycast Store preparation guide](https://developers.raycast.com/basics/prepare-an-extension-for-store) remains the authority for submission requirements.
