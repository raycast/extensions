# Logitech Litra extension for Raycast

This [Raycast](https://www.raycast.com/) extension allows you to manage your USB-connected Logitech Litra Glow and/or Logitech Litra Beam light(s) from Raycast, turning them on and off and setting their brightness and temperature.

![Screenshot](screenshot.png?raw=true)

*Note*: This will not work with Logitech Litra Beam devices connected using Bluetooth.

## Installation

To use this extension, as well as downloading the extension from the Raycast Store, you must also set up the [`litra` command line](https://github.com/timrogers/litra-rs) on your machine by following the instructions in the readme. 

You must be running at least `v2.4.0` of `litra`, and only `v2.x` versions are supported.

When you run the extension for the first time, you'll be prompted to configure the path of your `litra` binary. You can get this after installation by running `which litra` in a shell.