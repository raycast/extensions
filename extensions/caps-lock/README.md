# Caps Lock

One command: **Toggle Caps Lock**.

Keep access to Caps Lock after remapping its physical key to Hyper, Escape, Control, or another key. Run the command from Raycast or assign it a hotkey. A brief confirmation shows **Caps Lock On** or **Caps Lock Off**, then you can keep typing in your previous app.

The command changes the macOS modifier lock directly. It does not simulate pressing Caps Lock or change your keyboard mappings. This also lets you clear Caps Lock when your remapped key cannot turn it off.

## Requirements

- macOS 12 or later, on Apple silicon or Intel.
- No Homebrew package, administrator access, or developer tools needed to use the extension.

## Native helper

A small universal helper calls Apple's IOKit `IOHIDGetModifierLockState` and `IOHIDSetModifierLockState` APIs. It reads the current state, changes it, and verifies the new state before reporting success. Concurrent helper processes for the same user are serialized with a file lock, so overlapping commands do not lose toggles. The lock is automatically released when the process exits. It does not record keystrokes, access the network, or alter keyboard mappings.

The complete source is in [`native/caps-lock.c`](native/caps-lock.c). Rebuild the bundled `assets/caps-lock` with Apple's Command Line Tools:

```sh
npm run build:native
```

[`native/build.sh`](native/build.sh) compiles the same C source for arm64 and x86_64 with a macOS 12 deployment target, combines the results with `lipo`, and applies an ad-hoc signature. The helper links only to system libraries and IOKit. Command Line Tools are required only for rebuilding, not for users running the command.

Both `npm run build` and `npm run publish` rebuild the native helper before invoking the Raycast CLI. If compilation fails, bundling or publishing stops. When contributing directly through Git, run `npm run build:native` after changing the native source or build script and commit the rebuilt `assets/caps-lock` alongside those changes; the Store packages this checked-in binary.

Run `npm test` on macOS to test concurrent helper processes against a simulated keyboard, command notifications against a mocked Raycast API, and build/publish ordering with the real native compiler and stubbed Raycast CLIs. These tests do not change the real Caps Lock state or publish the extension.
