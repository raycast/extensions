# Logitech Litra extension for Raycast

This [Raycast](https://www.raycast.com/) extension allows you to manage your Logitech Litra Glow and/or Logitech Litra Beam light(s) from Raycast, turning them on and off and setting their brightness and temperature.

![Screenshot](screenshot.png?raw=true)

## Installation

To use this extension, as well as downloading the extension from the Raycast Store, you must also set up [Node.js](https://nodejs.org/en/) and [`npm`](https://www.npmjs.com/), and then install the `litra` npm package globally by running `npm install -g litra`.

When you run the extension for the first time, you'll be prompted to provide the directory where the `litra` package's CLI is installed. You can get this by running `dirname $(which litra-on)` from a terminal.
