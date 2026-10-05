# Shottr Extension User Guide

TLDR;

    1.	Open Shottr 1.8
    2.  Go to the Settings
    3.	Go to Advanced Tab
    4.	Turn on URL Schema API

---

Shottr is a tiny and fast mac screenshot tool with annotations, beautiful backgrounds, scrolling screenshots and cloud upload capabilities. Built with love and optimized for Apple silicon. This user guide provides detailed instructions on how to use the Shottr Extension for Raycast.

## Table of Contents

- [Shottr Extension User Guide](#shottr-extension-user-guide)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Installation and Setup](#installation-and-setup)
  - [Preferences](#preferences)
    - [Close Main Window](#close-main-window)
  - [Using Shottr](#using-shottr)
  - [Troubleshooting](#troubleshooting)

## Introduction

Shottr offers a variety of features including capturing screenshots, annotating them, and quick editing. Integrated with Raycast, it provides an enhanced user experience with streamlined access and added functionality.

## Installation and Setup

Before using the Shottr Extension:

1. Make sure Raycast is installed on your system.
2. Download and install Shottr.
3. Enable the URL Schema API in Shottr settings.
4. Install the Shottr Extension for Raycast from the Raycast store.
5. Once installed, you will find various commands under the Shottr Extension in Raycast.

## Preferences

### Close Main Window

This extension provides a preference to control whether Raycast's main window is closed before executing a screenshot command.

| Setting          | Behavior                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ON** (default) | Closes the Raycast main window before taking a screenshot — prevents the Raycast UI from appearing in your capture. However, you will **not** be able to screenshot Raycast's main window itself. |
| **OFF**          | Does not close the main window — recommended if you trigger commands via **keyboard shortcuts**, since the main window won't be opened in the first place.                                        |

**When to use ON:** You trigger Shottr commands by opening Raycast's main window and searching for the command.

**When to use OFF:** You have keyboard shortcuts bound directly to each Shottr command.

## Using Shottr

Screen Capture Features

- Open History: Access your screenshots history.
- Capture Fullscreen/Area/Repeat Previous Area/Window: Various modes for capturing your screen.
- Scrolling Capture: Capture content beyond the screen view.
- Capture Text (OCR): Use OCR to capture text from your screen.
- Load Image from clipboard
- Uploads

## Troubleshooting

If you encounter issues:

1. Check for updates to Shottr and the Raycast Extension.
2. Restart Raycast or your computer if the extension is not responding.
3. Create an issue and reach out via the Raycast Slack.
