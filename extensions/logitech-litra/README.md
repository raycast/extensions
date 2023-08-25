# Logitech Litra extension for Raycast

This [Raycast](https://www.raycast.com/) extension allows you to manage your Logitech Litra Glow and/or Logitech Litra Beam light(s) from Raycast, turning them on and off and setting their brightness and temperature.

![Screenshot](screenshot.png?raw=true)

## Installation

To use this extension, as well as downloading the extension from the Raycast Store, you must also set up [Node.js](https://nodejs.org/en/) and [`npm`](https://www.npmjs.com/), and then install the `litra` npm package globally by running `npm install -g litra`. You must be running at least v4.4.0 of the package.

When you run the extension for the first time, you'll be prompted to configure the "CLI directory" setting, pointing to the directory where the `litra` package's executables are installed. You can get this by running `dirname $(which litra-on)` in a shell.

Depending on how Node.js is installed, you may encounter a `env: node: No such file or directory` error when trying to use the extension. If you do, you should try setting the optional "Node.js binary path" setting. You can get the correct value by running `which node` in a shell.
