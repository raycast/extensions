# Raycast Store Submission Checklist

This checklist records the repository state; it is not a claim of automatic Store acceptance.

## Metadata and UX

- [x] Manifest uses the Raycast schema, `MIT`, the `macOS` platform, a Title Case extension name, Title Case verb–noun command names, a valid category, portable defaults, and no secret preferences.
- [x] Extension icon is a non-default 512×512 PNG at `assets/icon.png`; the 1254×1254 source is retained at `design/icon-source.png`. It is legible on light and dark backgrounds.
- [x] Five independently hotkeyable no-view commands provide start, pause, continue, stop, and toggle actions with HUD/toast feedback.
- [x] README covers onboarding, permissions, model download behavior, output files, consent, errors, and limitations.
- [x] `CHANGELOG.md`, `LICENSE`, `PRIVACY.md`, `CONTRIBUTING.md`, `package-lock.json`, and third-party notices are present.
- [x] Manifest author `bui_tr_ng_khanh_duy` matches the authenticated Raycast Store username reported by `ray profile`.
- [x] Three truthful 2000×1250 PNG Store screenshots are saved under `media/`: preferences and commands, active system-and-microphone recording, and paused capture. They use one consistent background and contain no private meeting data or other applications.

Official references: [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store), [Manifest](https://developers.raycast.com/information/manifest), [File Structure](https://developers.raycast.com/information/file-structure).

## Native binaries and licensing

- [x] Complete Swift helper source and SwiftPM tests are included under `Sources/` and `Tests/`.
- [x] `script/build_and_run.sh` reproducibly builds a universal arm64/x86_64 helper app and signs the nested encoder before the outer bundle.
- [x] `script/build_lame.sh` downloads LAME 3.100 from the official SourceForge project, verifies SHA-256 `ddfe36cab873794038ae2c1210557ad34857a4b6bdc515785d1da9e175b1da1e`, builds both architectures, and combines them into a universal executable.
- [x] `THIRD_PARTY_NOTICES.md` and the upstream LGPL-2.0 materials under `licenses/lame/` document provenance and redistribution terms. LAME runs as a separate executable and is not linked into the MIT helper.
- [x] No executable is downloaded from a developer-controlled server after review. Apple language assets are requested through the public `AssetInventory` API and downloaded/managed by macOS.
- [x] Binary payload remains modest. The final `.rayext` is 1,192,121 bytes with SHA-256 `ccf7daf7fb578bd2f4bab1fc84f04ce960a73999821635106ab27a44d9456ede`.
- [x] Final helper SHA-256: `b1c8e48f06ccb9f694126fd35be8f8bee568f65630351208a4d4f79bffd27c2e`. Final nested LAME SHA-256: `bcd6d8b852cbbf411782dd5b230cf981dd795e2cfabb7cebff24fbf3c011755a`.
- [ ] Raycast team action required: the official Store guidance says traceable bundled binaries currently need a Raycast team member to add/approve the binary. In the submission PR, explicitly request review of `assets/MeetingCaptureHelper.app` and its nested `lame`, link `CONTRIBUTING.md` and `THIRD_PARTY_NOTICES.md`, and provide the final SHA-256 values. Do not replace them after review without repeating that process.
- [x] `RAYCAST_BINARY_REVIEW.md` contains the reviewer-facing necessity, provenance, reproducible-build, licensing, architecture, privacy, and runtime-download explanation.

Official reference: [Binary Dependencies and Additional Configuration](https://developers.raycast.com/basics/prepare-an-extension-for-store#binary-dependencies-and-additional-configuration).

## Privacy and safety

- [x] No analytics, accounts, credentials, Keychain access, ads, or developer-controlled network service.
- [x] Audio and transcripts remain in the configured local folder. Apple model assets may download once from Apple; recorded audio is not uploaded.
- [x] MP3 finalization precedes model installation/transcription; transcript or asset failure preserves the MP3.
- [x] Recording requires explicit invocation and macOS Screen & System Audio Recording and Microphone permissions.
- [x] Consent/legal notice appears in README and `PRIVACY.md`.

Official reference: [Raycast Security](https://developers.raycast.com/information/security).

## Final validation and publication

- [x] Repository scripts cover clean `npm ci`, Swift tests, manifest assertions, lint/format, Raycast distribution build/typecheck, native reproducible build, universal architectures, strict nested signatures, archive inventory, dependency audit, and sensitive/stale-path scans.
- [x] `npm run build` is the official non-publishing distribution validation command.
- [ ] Human: review final git diff and commit the extension in the Raycast extensions repository workflow.
- [ ] Human/external action: run `npm run publish` only after explicit authorization. It authenticates with GitHub and opens/updates a pull request; this repository has not published, pushed, or opened a PR.
- [ ] Human/reviewer: verify macOS 27 availability expectations. The manifest can restrict to macOS but does not expose a minimum-OS or CPU-architecture field; the helper itself declares macOS 27 and is universal.

Official references: [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension), [Raycast CLI](https://developers.raycast.com/information/developer-tools/cli).
