# Meeting Capture for Raycast

A self-contained Raycast extension with individually hotkeyable **Start**, **Pause**, **Continue**, and **Stop Meeting Capture** commands. **Toggle Meeting Capture** remains as a start/stop convenience. Stop saves a real MP3 and creates a paired plain-text transcript. There is no Audio Hijack, separately installed CLI, or cloud-service dependency.

See [PRIVACY.md](PRIVACY.md) for the concise data-handling statement and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled encoder provenance.

## Requirements and constraints

- **macOS 27 or later** is required for ScreenCaptureKit's direct `mixesAudioWithMicrophone` path.
- A bundled Swift helper owns capture after the short Raycast command exits. Raycast launches its signed app bundle through LaunchServices so macOS attributes permissions correctly, then stores its PID/state in the extension support directory.
- macOS attributes Screen & System Audio Recording and Microphone permissions to `MeetingCaptureHelper`, not the transient Raycast command.
- The local helper is ad-hoc signed for a stable bundle identity. Public distribution requires Raycast Store review of the bundled binary and any signing guidance Raycast provides during that review. Rebuilding may require permission to be granted again.
- ScreenCaptureKit first finalizes a private temporary capture. The bundled, source-traceable LAME encoder then creates an actual MPEG Layer III file; the temporary capture is removed only after MP3 encoding succeeds.
- Apple exposes MP3 file identifiers and decoders but no public MP3 encoding path suitable for this extension. LAME 3.100 is therefore built from the official source archive with a pinned SHA-256. See `THIRD_PARTY_NOTICES.md` and `script/build_lame.sh`.
- Transcription uses macOS 27 `SpeechAnalyzer`, preferring `SpeechTranscriber` and falling back to the local-only `DictationTranscriber` when Apple does not offer the newer model for a locale. Apple states the new model is entirely on-device, and documents DictationTranscriber as excluding locales that require network recognition. Meeting Capture never uploads recorded audio or falls back to a cloud recognizer.

## Build and install locally

```bash
./script/build_and_run.sh --verify
npm install
npm test
npm run lint
npm run build
npm run dev
```

The native script builds in a temporary scratch directory, produces universal arm64/x86_64 helper and LAME executables, and clears extended attributes before strict signature verification.

The build script stages and ad-hoc signs `assets/MeetingCaptureHelper.app`; Raycast bundles the app as an asset. Recommended global hotkeys are `⌃⌥R` for **Start Meeting Capture**, `⌃⌥P` for **Pause Meeting Capture**, `⌃⌥C` for **Continue Meeting Capture**, and `⌃⌥S` for **Stop Meeting Capture**. Raycast exposes each no-view command independently, so use any conflict-free shortcuts you prefer.

## One-time permission setup

1. Invoke **Start Meeting Capture**.
2. Approve macOS **Screen & System Audio Recording** and **Microphone** access for MeetingCaptureHelper.
3. The helper declares why speech recognition is used. macOS 27's on-device `SpeechAnalyzer` path does not use the legacy `SFSpeechRecognizer` authorization prompt because Apple documents that prompt as applying only to recognition that can use Apple servers.
4. If macOS requests a restart, invoke Start again. Thereafter all five commands work directly from Raycast or assigned hotkeys.
5. Record a short Zoom/Google Meet test, then listen to the saved MP3 and inspect the paired `.txt`. Compilation does not prove captured audio or recognition quality.

The default folder is `~/Documents/Meeting Capture`. Existing preference overrides continue to be respected, and updating the extension never moves or deletes prior recordings. The red Raycast HUD and macOS privacy indicator show recording. Always tell participants and obtain consent; laws vary by location.

While recording, the signed native helper also shows a small click-through panel near the active display's top-right safe edge. It displays a red recording dot and elapsed capture time, never takes keyboard focus, and follows Spaces and full-screen apps. **Pause** genuinely stops the current ScreenCaptureKit segment: paused audio is not recorded, the elapsed timer freezes, and the panel says **Paused**. **Continue** starts the next segment under the same output basename. **Stop** concatenates only captured segments without a pause gap, then the panel changes to **Transcribing** and shows the selected transcript language while post-processing finishes and disappears afterward. Raycast itself only provides transient HUD/toast feedback and persistent menu-bar commands; it does not expose an arbitrary floating-window API, so the corner indicator intentionally lives in the source-available bundled helper.

## Language and transcript behavior

- **Transcript Language** offers exactly **Vietnamese**, **English**, **Vietnamese + English**, and **System Default**. English maps to Apple's closest supported locale equivalent to `en_US`; Vietnamese maps to `vi_VN`; System Default uses the closest supported locale to the current macOS locale.
- The default is **System Default**. The helper prefers Apple's newer `SpeechTranscriber` for a requested locale and falls back to local-only `DictationTranscriber` when needed. Vietnamese currently uses the latter.
- After the MP3 is safely finalized, the helper asks `AssetInventory` for the selected module's status. If necessary, macOS automatically reserves, downloads, and installs the model from Apple; the overlay and atomic state file show **Downloading model** and progress. Later recordings reuse the system-managed asset. No manual Language & Region setup is required.
- Offline, storage, resource-limit/reservation, cancellation, unsupported-device, or installation failures never remove the MP3. State reports the failure and asks for a later short-capture retry after connectivity or storage is fixed. A concurrent recording cannot start while model installation/transcription is active.
- Bilingual mode makes two independent, finalized, time-indexed on-device passes: English prefers `SpeechTranscriber`, while Vietnamese can fall back to `DictationTranscriber`. Both APIs expose result ranges, alternatives, and attributed confidence/time metadata. Results are not concatenated. The deterministic merger sorts by audio time, groups readings that overlap by at least 55% of the shorter range, removes case/diacritic/punctuation-equivalent duplicates, and selects one reading per overlap group using confidence, cross-pass alternative agreement, Vietnamese-script evidence, then stable lexical tie-breaks. Non-overlapping passages remain in chronological order. If confidence is absent for a result, conservative fixed scores and deterministic tie-breaks are used.
- Code-switching accuracy is inherently limited: each recognizer is monolingual, result time ranges may span several words, and short borrowed words can be plausible in both languages. The merger never invents or translates words; when competing readings overlap, it keeps one supported recognition candidate, so it can omit a genuine switch rather than duplicate or hallucinate it.
- A successful recording produces same-basename files such as `Meeting_2026-09-16_10-07-58.mp3` and `Meeting_2026-09-16_10-07-58.txt`. The transcript contains UTF-8 plain text only; an empty file represents silence/no recognized speech.
- MP3 finalization completes before transcription begins. The transcript is written atomically, so crashes or cancellation never expose a half-written `.txt`.

## Safety

- The PID is checked before stop, stale state is ignored, and stop waits for finalization.
- Commands communicate with the helper through atomic, uniquely named JSON requests in Raycast's extension support directory. The helper acknowledges each request ID in its atomic state file, preventing repeated or concurrent commands from silently racing.
- Invalid transitions are harmless: Start while active, Pause while idle/paused, Continue while idle/recording, and Stop while idle/finalizing/transcribing report the current state without altering audio.
- Files use timestamps such as `Meeting_2026-09-15_22-05-30.mp3`; same-second collisions receive `_2`, `_3`, and so on.
- Permission denial, missing helper, recorder failure, and finalization failure produce a failure toast.
- A detached helper avoids relying on Raycast keeping a no-view command alive.
- The panel uses the display's current `visibleFrame`, avoiding the menu bar, Dock, and camera housing; display changes reposition it safely.
- Long meetings are captured to disk rather than accumulated in memory. Encoding uses a temporary WAV in the destination volume and transcription streams results from the finalized capture.

## Official references

- [Raycast Getting Started](https://developers.raycast.com/basics/getting-started)
- [Raycast manifest](https://developers.raycast.com/information/manifest)
- [Apple ScreenCaptureKit](https://developer.apple.com/documentation/screencapturekit)
- [Apple macOS capture sample](https://developer.apple.com/documentation/screencapturekit/capturing-screen-content-in-macos)
- [Apple SCRecordingOutputConfiguration](https://developer.apple.com/documentation/screencapturekit/screcordingoutputconfiguration)
- [Apple SpeechAnalyzer](https://developer.apple.com/documentation/speech/speechanalyzer)
- [Apple AssetInventory](https://developer.apple.com/documentation/speech/assetinventory)
- [Apple DictationTranscriber](https://developer.apple.com/documentation/speech/dictationtranscriber)
- [Apple speech-recognition permission guidance](https://developer.apple.com/documentation/speech/asking-permission-to-use-speech-recognition)
- [Raycast Store binary guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [Raycast manifest schema](https://developers.raycast.com/information/manifest)
- [Raycast publication workflow](https://developers.raycast.com/basics/publish-an-extension)
- [LAME official source downloads](https://sourceforge.net/projects/lame/files/lame/3.100/)
