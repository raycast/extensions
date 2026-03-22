# DefaultMic

Raycast extension for macOS with 2 commands:

- `Select Default Mic` - choose and set the default microphone from a list.
- `Toggle Mic Lock` - turn lock on/off. When lock is ON, the extension keeps restoring the selected microphone even after connecting other audio devices.

## Dependency handling

The extension needs `SwitchAudioSource` and checks it every time commands are opened.

If the binary is missing, the extension automatically installs `switchaudio-osx` via Homebrew.

You can also run installation manually from the action panel using `Install SwitchAudioSource`.

If Homebrew is missing or installation fails, the extension shows a clear error message with the next step.
