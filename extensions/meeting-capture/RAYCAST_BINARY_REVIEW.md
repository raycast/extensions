# Bundled Binary Review Request

Meeting Capture requires approval for two source-traceable universal executables bundled inside `assets/MeetingCaptureHelper.app`:

1. `Contents/MacOS/MeetingCaptureHelper` records system audio and microphone through Apple's ScreenCaptureKit, shows the recording indicator, and performs local Apple Speech transcription.
2. `Contents/Resources/lame` converts the finalized local capture to a genuine MP3. macOS exposes MP3 decoding but no public native MP3 encoder suitable for this extension.

Neither executable is downloaded or replaced at runtime. The helper source is included under `Sources/`, with tests under `Tests/`. `script/build_and_run.sh` builds the helper for arm64 and x86_64, embeds the encoder, clears extended attributes, and signs the nested executable before the outer app. `script/build_lame.sh` downloads the official LAME 3.100 source archive, verifies the pinned SHA-256, builds both architectures, and combines them with `lipo`.

LAME runs as a separate executable and is not linked into the MIT helper. Its LGPL-2.0 notices and upstream license files are included in `THIRD_PARTY_NOTICES.md` and `licenses/lame/`.

Audio and transcripts remain in the user's selected local folder. Recorded audio is never uploaded. The only network-related post-processing is macOS-managed download of Apple on-device speech assets when a selected language model is not installed. The extension has no analytics, accounts, credentials, Keychain access, ads, or developer-controlled service.

## Final artifacts

- `.rayext`: 1,177,013 bytes; SHA-256 `0d96c4875cfa6cb6803bbe05f8b6b549dc94cc644ef112ad5ca9274d45191197`
- Helper SHA-256: `a28f970fab74c7b0a79291d8e3b19bf7621a0d94322858be2bc376490a1b0be9`
- Nested LAME SHA-256: `bcd6d8b852cbbf411782dd5b230cf981dd795e2cfabb7cebff24fbf3c011755a`
- Architectures: arm64 and x86_64 for both executables
- Bundle identifier: `com.raycast.extensions.meeting-capture.helper`

Please review and approve these bundled binaries for the Raycast Store submission. Rebuild instructions and independent verification commands are in `CONTRIBUTING.md`; the complete readiness record is in `STORE_SUBMISSION.md`.
