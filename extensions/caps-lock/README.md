# Caps Lock

One command: **Toggle Caps Lock**.

Keep access to Caps Lock after remapping its physical key to Hyper, Escape, Control, or another key. Run the command from Raycast or assign it a hotkey. A brief confirmation shows **Caps Lock On** or **Caps Lock Off**, then you can keep typing in your previous app.

The command changes the macOS modifier lock directly. It does not simulate pressing Caps Lock or change your keyboard mappings. This also lets you clear Caps Lock when your remapped key cannot turn it off.

## Requirements

- macOS 12 or later, on Apple silicon or Intel.
- No Homebrew package, administrator access, or developer tools needed to use the extension.

## Troubleshooting

### Both-sided Shift hotkey may fail to turn Caps Lock off

Raycast supports a [both-sided modifier hotkey](https://manual.raycast.com/command-aliases-and-hotkeys): hold **Left Shift + Right Shift simultaneously** (`L⇧ R⇧`). A Shift double-tap is a separate shortcut type.

On a reported setup, this hotkey turns Caps Lock **on**, but pressing it again while Caps Lock is enabled produces no **Caps Lock Off** confirmation or error message and leaves Caps Lock on. Running **Toggle Caps Lock** directly from Raycast successfully turns it off. Disabling and re-enabling the extension, then restarting Raycast, did not resolve the shortcut behavior.

**Observed configuration:** Raycast **2.7.3.0**, macOS **27.2** (build **26B5101f**), Apple silicon (`arm64`), and the **Apple Internal Keyboard / Trackpad**. During troubleshooting, Raycast's Hyper Key diagnostic also listed **Karabiner DriverKit VirtualHIDKeyboard 1.8.0** and **BetterTouchTool**. Their involvement has not been established. The cause has not been confirmed, and other versions, architectures, and keyboards have not been verified for this issue.

**Workaround:** In **Raycast Settings → Shortcuts**, assign **Toggle Caps Lock** a modifier-plus-key hotkey such as **Control + Option + C** (`⌃⌥C`). This combination was verified to turn Caps Lock both on and off on the reported setup. To turn Caps Lock off immediately, run the command directly from Raycast.

## Native implementation

The [Swift Package](swift/caps-lock/Package.swift) exports `toggleCapsLock()` through Raycast's `@raycast` bridge. [CapsLock.swift](swift/caps-lock/Sources/CapsLock.swift) calls Apple's IOKit `IOHIDGetModifierLockState` and `IOHIDSetModifierLockState` APIs. It reads the current state, changes it, and verifies the new state before reporting success. Concurrent invocations for the same user are serialized with a file lock, so overlapping commands do not lose toggles. A five-second watchdog terminates a stalled native process, releasing its lock so later commands can recover. If a timeout occurs, the state may already have changed; check Caps Lock before trying again. Closing the descriptor, including on process exit, releases the lock. It does not record keystrokes, access the network, or alter keyboard mappings.

`npm run build` uses `ray build` to compile the Swift source and generate the TypeScript interface, following Raycast's [Swift tools](https://github.com/raycast/extensions-swift-tools) and the Color Picker extension. No prebuilt executable or custom native build script is checked in. Developing and building the Swift bridge through Raycast requires full Xcode; Command Line Tools alone are insufficient. Users receive the compiled extension and do not need these tools.

Run `npm test` on macOS to test the production Swift logic against simulated keyboard APIs and the command against a mocked Raycast API and Swift bridge. These tests cover concurrent processes, watchdog recovery, process-death lock release, unsafe lock paths, keyboard failures, state verification, and notification failures. They do not change the real Caps Lock state or publish the extension. Run `npm run build -- --environment dist`, `npm run lint`, and `npx tsc --noEmit` to validate the generated bridge and extension.
