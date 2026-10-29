# Brightness Control

Quickly control the brightness levels of your display.

## Commands

### Brightness Up / Brightness Down

Increase or decrease the brightness by 10% (configurable). Works reliably when triggered via a Raycast hotkey (held modifier keys no longer suppress the adjustment).

### Set Brightness

Set the brightness of your display to an exact level (0-100) directly from the search bar.

### Max Brightness

Instantly set brightness to 100%.

### Min Brightness

Instantly set brights to 0%.

## Preferences

| Name | Default | Description |
| --- | --- | --- |
| Close Raycast | Enabled | Close Raycast after changing brightness |
| Show display name | Disabled | Show display name in toasts and HUDs |
| Step Size | 10 | Brightness change per press |

## Prerequisites

**macOS**

All commands require [Lunar](https://lunar.fyi/) (free for basic brightness control). The extension will automatically install Lunar and its CLI on first use via Homebrew. If auto-install fails, you'll get actionable prompts to open the Lunar website or copy the install command.

**Windows**

No prerequisites. Brightness is applied through a native backend (WMI for internal displays, DDC/CI for external ones), so changes apply instantly.
