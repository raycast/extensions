# Brightness Control

Quickly control the brightness levels of your display. Includes simple step-based controls and precise Lunar-based commands with multi-monitor support.

## Commands

### Brightness Up / Brightness Down

Increase or decrease the brightness by one system step (~10%) using simulated keyboard shortcuts. Works out of the box with no extra dependencies.

### Set Brightness

Set the brightness of a specific display to an exact level (1-100) using [Lunar](https://lunar.fyi/). Features:

- Automatic cursor-based display detection
- Manual display selection for multi-monitor setups
- Sync mode toggle for non-main displays (adaptive mode)
- Visual feedback with old and new brightness values

### Max Brightness

Instantly set brightness to 100% on the display where your cursor is located. Uses [Lunar](https://lunar.fyi/) under the hood.

## Prerequisites

The **Brightness Up** and **Brightness Down** commands work without any additional setup.

The **Set Brightness** and **Max Brightness** commands require [Lunar](https://lunar.fyi/):

1. Install the Lunar app:

   ```bash
   brew install --cask lunar
   ```

2. Install the Lunar CLI (the extension will guide you through this on first use, or run manually):

   ```bash
   /Applications/Lunar.app/Contents/MacOS/Lunar install-cli
   ```

Lunar is free for basic brightness control.
