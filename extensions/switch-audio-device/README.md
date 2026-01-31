# Switch Audio Device

A Raycast extension to quickly switch between audio input and output devices.

## Features

- List all available audio output (playback) devices
- List all available audio input (recording) devices
- Switch default audio device with a single action
- Cross-platform support for macOS and Windows

## Prerequisites

This extension requires external command-line tools to interact with system audio devices.

### macOS

Install [SwitchAudioSource](https://github.com/deweller/switchaudio-osx) via Homebrew:

```bash
brew install switchaudio-osx
```

### Windows

Install the [AudioDeviceCmdlets](https://github.com/frgnca/AudioDeviceCmdlets) PowerShell module:

```powershell
Install-Module -Name AudioDeviceCmdlets -Force
```

## Usage

1. Open Raycast
2. Search for "Switch Output Device" or "Switch Input Device"
3. Select the device you want to set as default
