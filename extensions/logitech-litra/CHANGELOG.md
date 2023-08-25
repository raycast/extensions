# Logitech Litra Changelog

## [Fix support for non-standard Node.js installations] - 2023-05-04

- The extension now works with non-standard Node.js installations (e.g. from `nvm`) where we get a `env: node: No such file or directory` error when trying to run `/usr/bin/env node`. It adds a new optional "Node.js binary path" setting which can be set to point directly to the Node.js binary, rather than relying on `/usr/bin/env node`.

## [Toggle your Litra, rather than turning it on or off] - 2023-03-28

- Instead of separate, painful-to-use "On" and "Off" actions, we now have a simple "Toggle" action. You'll need to update to the latest version of the `litra` npm package.

## [Brightness and temperature support] - 2023-03-04

- Add support for setting the brightness and temperature of your Litra devices - thanks to [@zalewskigrzegorz](https://github.com/zalewskigrzegorz) for the [suggestion](https://github.com/raycast/extensions/issues/5101)!

## [Initial Version] - 2023-02-11
