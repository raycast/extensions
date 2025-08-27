# Logitech Litra Changelog

## [Add support for Litra devices which don't expose a serial number] - 2025-08-25

- __BREAKING CHANGE__: Require at least v2.4.0 of the [`litra` CLI](https://github.com/timrogers/litra-rs)
- Target Litra devices based on their device path rather than their serial number, to handle some devices which don't expose a serial number (fixes https://github.com/raycast/extensions/issues/20332)

## [Allow `v1.x` of the `litra` CLI] - 2024-04-25

- `v1.x` of the [`litra` CLI](https://github.com/timrogers/litra-rs) is now supported, alongside `v0.x`

## [Improve the UI for displaying your Litra devices] - 2024-01-23

- The extension UI now shows the state of each Litra device - whether it's on or off, and the current brightness and temperature 💡
- We've fixed the "loading" state, so you avoid a flash of the "No devices found" screen when devices are connected.
- The "No devices found" screen now mentions all of the types of Litra devices that are supported.

## [Switch to using the new and more reliable `litra` CLI under the hood] - 2024-01-15

- __BREAKING CHANGE__: The extension now uses a [new `litra` CLI](https://github.com/timrogers/litra-rs), built in Rust, under the hood. No more painful problems with Node and npm! 🙏
- Logitech Litra Beam LX devices are now supported, as well as the Litra Glow and Litra Beam ✨

## [Improve the UX when no Litra devices are found] - 2023-05-18

- The extension now shows a helpful message if no connected Litra devices are found when using the "Manage Devices" command.
- We've documented that your Litra device(s) must be connected via USB - not Bluetooth, which is supported by the Litra Beam.

## [Fix support for non-standard Node.js installations] - 2023-05-04

- The extension now works with non-standard Node.js installations (e.g. from `nvm`) where we get a `env: node: No such file or directory` error when trying to run `/usr/bin/env node`. It adds a new optional "Node.js binary path" setting which can be set to point directly to the Node.js binary, rather than relying on `/usr/bin/env node`.

## [Toggle your Litra, rather than turning it on or off] - 2023-03-28

- Instead of separate, painful-to-use "On" and "Off" actions, we now have a simple "Toggle" action. You'll need to update to the latest version of the `litra` npm package.

## [Brightness and temperature support] - 2023-03-04

- Add support for setting the brightness and temperature of your Litra devices - thanks to [@zalewskigrzegorz](https://github.com/zalewskigrzegorz) for the [suggestion](https://github.com/raycast/extensions/issues/5101)!

## [Initial Version] - 2023-02-11
