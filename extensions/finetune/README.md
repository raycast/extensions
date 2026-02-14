# FineTune for Raycast

A Raycast extension for controlling audio on macOS. Provides system volume control, device switching, and native per-app volume control for supported applications.

## Features

### System Audio Control

- **Set System Volume** - Quickly set volume with presets or fine control (5% steps)
- **Toggle Mute** - Instantly mute/unmute system audio
- **Switch Output Device** - Quick device switching between speakers, headphones, AirPods, etc.

### App Audio Control

- **Per-App Volume** - Control volume for individual running applications (Music, Spotify, TV, etc.)
- **Visual Feedback** - See volume levels with visual progression bars
- **Device Selection** - Switch output devices for supported apps

### Menu Bar

- Always visible volume indicator in your menu bar
- Quick access to volume presets
- Switch output devices without leaving your current app
- Background refresh to keep volume status updated

## Commands

| Command                  | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| **Control App Volume**   | Main interface showing volume, devices, and running audio apps |
| **Switch Output Device** | Quick device switching interface                               |
| **Set System Volume**    | Volume presets and fine control                                |
| **Toggle Mute**          | One-key mute toggle (no-view mode)                             |
| **Audio Menu Bar**       | Menu bar command for quick access                              |

## Requirements

- macOS 14.0 (Sonoma) or later
- Raycast 1.26.0 or higher
- Node.js 22.14 or higher

### Optional (Recommended)

- **[SwitchAudioSource](https://github.com/deweller/switchaudio-osx)** - For seamless audio device switching
  ```bash
  brew install switchaudio-osx
  ```

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development:
   ```bash
   npm run dev
   ```

## How It Works

This extension uses macOS AppleScript to control system audio.

- **System Volume/Mute**: Uses standard AppleScript commands.
- **Per-App Control**: Uses AppleScript to control applications that support scripting (e.g., Music, Spotify).
- **Device Switching**: Uses `switchaudio-osx` if available, otherwise falls back to system profiler (view only) or manual switching.

## License

MIT
