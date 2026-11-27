# Lid Light

Control the illuminated Apple logo on a MacBook Pro with PROLED XDR Display. Both commands live in Raycast. A background macOS helper keeps effects running after you dismiss Raycast.

- **Control Lid Light** shows whether the logo is on and its current glow. Adjust brightness, choose Steady, Breathe, Pulse, Heartbeat, or Sound, and play a Morse message once or on a loop.
- **Toggle Lid Light** flips the current setting from Raycast search. It can also be assigned a Raycast hotkey.
- **Battery Indicator** maps brightness to the battery charge. **Charging Light** breathes while the Mac charges.
- **Lit with Lid Closed** can keep the Mac awake while it is plugged in. **Stop Helper** stops the effects and returns the logo to its normal brightness.
- **Launch at Login** is optional. **Sound** uses macOS system audio capture, with permission, to read the current loudness. The helper does not save audio.

If LogoLight is running, choose **Quit LogoLight and Take Control** in the control command. Both apps control the same LED.

## Build from source

On a Mac, install Node.js 22.22.2 or later and Xcode or the Xcode Command Line Tools with Swift 6. Run:

```sh
npm ci
npm run build
```

The install step compiles and ad-hoc signs the Apple silicon helper from the Swift sources in `native/`. The Raycast build includes the generated helper in its assets. No precompiled helper is checked into the source.

For local use, select this folder with Raycast’s **Import Extension** command, then run `npm run build:local`. For development with automatic rebuilds, use `npm run dev`.

## Native hardware control

The helper uses CoreBrightness’s private LED controls. Compatibility may change with macOS updates. It communicates over a Unix socket in a directory accessible only to the current user. When direct on/off control is unavailable on supported hardware, the helper can invoke Apple’s documented switch with a macOS administrator prompt.

The native controller and effects are based on [LogoLight by Ark0N](https://github.com/Ark0N/LogoLight/tree/1495f1d61b218242e429d03d8645c3274f4a098c), under the [MIT License](LICENSE).
