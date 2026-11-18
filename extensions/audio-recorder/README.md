# Audio Recorder

Record meetings, microphone and system audio directly from Raycast. Save locally as M4A or WAV with no account, upload, transcription, AI service or virtual audio driver.

Requires an Apple Silicon Mac running macOS 15 or later.

## Get started

1. Open **Audio Recorder** in Raycast.
2. Choose Microphone, System Audio, or Microphone + System Audio in the dropdown.
3. Select **Ready to Record** and press Return. Allow the requested macOS audio permissions.
4. Press Return to pause/resume, or ⌘S to stop and save. The red menu bar indicator shows the elapsed time.

Close and reopen Raycast normally; recording continues independently. Choose **Show Waveform** (⌘O) to see source levels and a waveform inside Raycast. The recording library shows date, time and file size.

## Commands and shortcuts

- **Audio Recorder** — control recording and browse the local library.
- **Start Recording** — start using preferences; suitable for a global hotkey.
- **Pause Recording**, **Resume Recording**, **Stop Recording** — independent commands, also suitable for hotkeys.

Assign global hotkeys in Raycast Settings → Extensions → Audio Recorder. The dropdown changes the mode for starts from the main interface; the separate Start Recording command uses the default mode in extension preferences.

The library provides Play, Show in Finder, Rename, Copy Recording, Copy File Path and Move to Trash. Deleting asks first and uses macOS Trash. Renaming preserves the extension and never overwrites another recording. The library remembers output folders used by this installation; moving a file elsewhere removes it from these folder views.

## Preferences

- **Recording Mode**: Microphone + System Audio (default), System Audio, or Microphone.
- **Microphone Input**: System Default Microphone or Built-in Microphone. Choose Built-in Microphone to keep earbuds/headphones as playback output while recording your voice through the MacBook microphone.
- **Audio Format**: M4A (AAC, 256 kbps, 48 kHz stereo) or WAV (16-bit PCM, 48 kHz stereo).
- **Output Folder**: defaults to `~/Documents/Recordings` when left empty.

Names use local recording date/time with a short collision-resistant suffix, such as `Recording_2026-11-17_23-46-07_9F2A34.m4a`.

## Permissions

On first use macOS may request **System Audio Recording** and, for microphone modes, **Microphone** access. Check the app named by the actual prompt (which can depend on the launch context). It can also ask for access to Documents or another protected output folder. Allow only the permissions required by your selected mode.

If denied, use the permission actions in the recorder's action panel, or open System Settings → Privacy & Security → Microphone / Screen & System Audio Recording. On some macOS releases audio-only permission appears in the latter pane. Start again after granting permission. No Accessibility permission is required by this extension.

Permission attribution can depend on the launch context and macOS version; check the application named by the actual prompt. If access is already enabled after an update, quit the idle recorder from its menu bar and retry.

## Headphones, AirPods and meetings

System audio is captured digitally before output, so it does not need to be audible to the microphone. It works independently of the selected speakers/headphones. By default the microphone source is the **macOS default input**, which can differ from the microphone chosen inside Zoom/Discord/Teams. Select **Microphone Input → Built-in Microphone** in extension preferences to use the Mac microphone without changing headphone playback, or select the desired system-default input in System Settings → Sound before recording. To preserve headphone playback quality, consider the MacBook microphone rather than the AirPods microphone; Bluetooth microphone use can change the device's audio profile.

The helper does not depend on a meeting service's API or recorder feature. Google Meet, Discord, Zoom and Teams audio is captured as ordinary application playback. This implementation has not been exhaustively tested against all versions of those apps or all AirPods models. Protected/DRM content or applications that do not expose capturable playback may not be recordable.

There is no microphone monitoring or playback loop in the helper. With physical speakers, the microphone can still pick up speaker sound: use headphones to prevent acoustic echo. This build does **not** claim universal acoustic echo cancellation.

Raycast shows the selected microphone, source signal levels and audio warnings. The optional Show Waveform view displays the last eight seconds of captured audio inside Raycast. After five seconds of entirely zero samples it warns that no sound has been detected. An all-silent file is still saved, with a warning rather than an unqualified success. Packet arrival alone is not treated as evidence of audible audio.

## Reliability and long recordings

- Separate sample-rate converters produce 48 kHz stereo. Host timestamps place each packet on a shared timeline, preventing accumulated offset from independently running source clocks. Core Audio tap drift compensation is enabled. Missing packets become silence instead of shifting later audio.
- Combined mode uses 0.5 gain per source for mixing headroom; samples are bounded to the valid range. Single-source mode preserves normal gain.
- Audio buffers and conversion operate in bounded memory. Recording duration has no application-imposed time limit; available storage and filesystem/container constraints still apply.
- A hidden, uncompressed 32-bit float CAF staging file is written beside the output, using approximately **1.38 GB/hour**. At stop, it is streamed into the chosen format, validated, then removed. **Saving takes time** and needs additional disk space; the menu bar displays Saving. The helper remains alive until export finishes.
- WAV is split into numbered files before RIFF's 4 GiB limit, retaining all frames rather than imposing a duration limit. M4A is the recommended format for long meetings.
- Fewer than 512 MB free prevents a new capture or stops an existing one safely. If export runs out of space, the source and recovery journal are retained.
- Normal default-device changes rebuild capture sources on the same recording timeline. A brief device reconnection can leave a silent gap. Repeated failures stop and save with an explicit error.
- Sleep or user-session changes stop and save the recording. Audio cannot be captured while the Mac is asleep.
- SIGTERM requests safe finalization. After a crash/force quit, choose **Recover Interrupted Recording** from Raycast or the helper menu. Do not manually delete its hidden CAF source. Power-loss recovery remains dependent on the filesystem actually having committed the last writes.

**Do not replace/rebuild the helper during an active recording.** Stop and wait for saving to finish first. To quit an idle helper, use its menu bar menu. To uninstall, stop recording, quit the helper and remove the local extension from Raycast; recordings remain in your chosen output folders.


Recording control uses private local files; no network listener, login item or persistent launch agent is installed. Recordings stay in your chosen output folders after uninstalling.
