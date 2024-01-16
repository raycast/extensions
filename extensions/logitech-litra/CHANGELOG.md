# Logitech Litra Changelog

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
