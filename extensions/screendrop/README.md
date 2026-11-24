# Screendrop

Take screenshots, copy text from the screen, and record your screen with [Screendrop](https://github.com/fayazara/Screendrop) from Raycast.

## Requirements

This extension controls the Screendrop app through its `screendrop://` URL scheme, so Screendrop must be installed.

- **Screendrop v0.40.1 or later.** Earlier versions either lack the URL scheme or open the Library on every command. Download the latest release from [GitHub Releases](https://github.com/fayazara/Screendrop/releases).

## Commands

| Command            | What it does                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Capture Area       | Capture a region you drag out                                                                                              |
| Capture Fullscreen | Capture the entire screen                                                                                                  |
| Capture Window     | Capture a window you click                                                                                                 |
| Capture Text (OCR) | Copy the text inside a region you drag out                                                                                 |
| Record Screen      | Choose a display, window, or area and start recording. If a recording is running, this stops it                            |
| Stop Recording     | Stop the current screen recording                                                                                          |
| Open Library       | Show your screenshots and recordings                                                                                       |
| Open Settings      | Open Screendrop's settings, optionally on a specific tab. Turned off by default; enable it in Raycast's extension settings |
