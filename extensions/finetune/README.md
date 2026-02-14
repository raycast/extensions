# FineTune for Raycast

A Raycast extension for controlling audio on macOS. Provides system volume control, device switching, and native per-app volume control for supported applications.

## Features

- Detect running audio apps and show their playback status
- Show current system output device and available outputs
- Provide quick control actions directly from Raycast
- Integrate with the FineTune macOS app for advanced per-app routing and volume control

## Commands

| Command                | Description                                                                       |
| ---------------------- | --------------------------------------------------------------------------------- |
| **Control App Volume** | View running audio apps and outputs, then open FineTune for per-app management. |

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

The extension gathers system audio context (apps and outputs) and provides quick actions from Raycast.

- **FineTune integration**: Opens FineTune directly for advanced per-app routing and volume.
- **Device switching**: Uses `switchaudio-osx` when available for seamless switching.

## License

MIT
