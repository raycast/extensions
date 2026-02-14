# Brightness Control

Quickly control the brightness levels of your display. Includes simple step-based controls and precise Lunar-based commands.

## Commands

### Brightness Up / Brightness Down

Increase or decrease the brightness by one system step (~10%) using simulated keyboard shortcuts. Works out of the box with no extra dependencies.

### Set Brightness

Set the brightness of your display to an exact level (1-100) directly from the search bar using [Lunar](https://lunar.fyi/). Automatically detects the display where your cursor is located.

### Max Brightness

Instantly set brightness to 100% on the display where your cursor is located. Uses [Lunar](https://lunar.fyi/) under the hood.

## Prerequisites

The **Brightness Up** and **Brightness Down** commands work without any additional setup.

The **Set Brightness** and **Max Brightness** commands require [Lunar](https://lunar.fyi/) (free for basic brightness control). The extension will automatically install Lunar and its CLI on first use via Homebrew. If auto-install fails, you'll get actionable prompts to open the Lunar website or copy the install command.
