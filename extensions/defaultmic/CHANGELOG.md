# DefaultMic Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Added `Select Default Mic` command to list input devices and set the active system microphone.
- Added `Toggle Mic Lock` command to enable or disable persistent microphone locking.
- Added preferred microphone persistence via Raycast LocalStorage.
- Added automatic sync of lock target when a new preferred microphone is selected.
- Added background lock agent setup via LaunchAgent to keep the selected microphone active.
- Added automatic installation of `switchaudio-osx` via Homebrew when `SwitchAudioSource` is missing.
- Added clearer dependency error messages when Homebrew is unavailable or install fails.
