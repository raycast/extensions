# PowerToys Tool Runner for Raycast

Quickly launch Microsoft PowerToys utilities directly from Raycast on Windows.

This extension is a port of PederBirk's excellent Flow Launcher plugin: [https://github.com/PederBirk/Flow.Launcher.Plugin.PowerToys](https://github.com/PederBirk/Flow.Launcher.Plugin.PowerToys)

## Features

Launch any PowerToys tool instantly:

- **Color Picker** - Pick colors from anywhere on your screen
- **Measure Tool** - Measure pixels on your screen
- **Shortcut Guide** - Display keyboard shortcuts overlay
- **Extract Text (OCR)** - Extract text from images
- **Always on Top** - Pin the active window on top
- **FancyZones Editor** - Create custom window layouts
- **Hosts File Editor** - Edit Windows hosts file
- **Registry Preview** - Preview .reg files before importing
- **Workspaces** - Launch workspace configurations
- **Environment Variables** - Edit system environment variables
- **Crop and Lock** - Reparent and Thumbnail modes

## Usage

Simply search for any PowerToys tool by name in Raycast and press Enter. The tool will launch immediately, and the Raycast window will hide automatically.

## Notes

- PowerToys must be running in the background for the extension to work
- Make sure the specific PowerToys utility you want to use is enabled in PowerToys Settings
- The extension uses Windows event handles to communicate with PowerToys
