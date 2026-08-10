# Logitech Litra extension for Raycast

This [Raycast](https://www.raycast.com/) extension allows you to manage your USB-connected Logitech Litra Glow and/or Logitech Litra Beam light(s) from Raycast, turning them on and off and setting their brightness and temperature. For Litra Beam LX devices, you can also control the colorful back light, including turning it on and off, setting its brightness, and changing its color.

![Screenshot](screenshot.png?raw=true)

_Note_: This will not work with Logitech Litra Beam devices connected using Bluetooth.

## Installation

To use this extension, as well as downloading the extension from the Raycast Store, you must also set up the [`litra` command line](https://github.com/timrogers/litra-rs) on your machine by following the instructions in the readme.

You must be running at least `v2.4.0` of `litra`. Both `v2.x` and `v3.x` versions are supported. Note that back light control for Litra Beam LX devices is only available in `v3.x`.

When you run the extension for the first time, you'll be prompted to configure the path of your `litra` binary. You can get this after installation by running `which litra` in a shell.
