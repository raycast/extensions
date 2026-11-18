# Caps Lock

One command: **Toggle Caps Lock**.

Keep access to Caps Lock after remapping its physical key to Hyper, Escape, Control, or another key. Run the command from Raycast or assign it a hotkey. A brief confirmation shows **Caps Lock On** or **Caps Lock Off**, then you can keep typing in your previous app.

The command changes the macOS modifier lock directly. It does not simulate pressing Caps Lock or change your keyboard mappings. This also lets you clear Caps Lock when your remapped key cannot turn it off.

## Requirements

- macOS 12 or later, on Apple silicon or Intel.
- No Homebrew package, administrator access, or developer tools needed to use the extension.

## Native implementation

The [Swift Package](swift/caps-lock/Package.swift) exports `toggleCapsLock()` through Raycast's `@raycast` bridge. [CapsLock.swift](swift/caps-lock/Sources/CapsLock.swift) calls Apple's IOKit `IOHIDGetModifierLockState` and `IOHIDSetModifierLockState` APIs. It reads the current state, changes it, and verifies the new state before reporting success. Concurrent invocations for the same user are serialized with a file lock, so overlapping commands do not lose toggles. A five-second watchdog terminates a stalled native process, releasing its lock so later commands can recover. If a timeout occurs, the state may already have changed; check Caps Lock before trying again. Closing the descriptor, including on process exit, releases the lock. It does not record keystrokes, access the network, or alter keyboard mappings.

`npm run build` uses `ray build` to compile the Swift source and generate the TypeScript interface, following Raycast's [Swift tools](https://github.com/raycast/extensions-swift-tools) and the Color Picker extension. No prebuilt executable or custom native build script is checked in. Developing and building the Swift bridge through Raycast requires full Xcode; Command Line Tools alone are insufficient. Users receive the compiled extension and do not need these tools.

Run `npm test` on macOS to test the production Swift logic against simulated keyboard APIs and the command against a mocked Raycast API and Swift bridge. These tests cover concurrent processes, watchdog recovery, process-death lock release, unsafe lock paths, keyboard failures, state verification, and notification failures. They do not change the real Caps Lock state or publish the extension. Run `npm run build -- --environment dist`, `npm run lint`, and `npx tsc --noEmit` to validate the generated bridge and extension.
