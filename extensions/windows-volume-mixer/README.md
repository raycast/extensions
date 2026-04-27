# Windows Volume Mixer

A Raycast extension to control the Windows Volume Mixer directly from your keyboard.

## Features

- **View Audio Sessions**: See all applications currently playing audio
- **Per-App Volume Control**: Adjust volume for individual applications
- **Mute/Unmute**: Toggle mute for any application
- **Audio Device Switching**: Change default audio input/output devices
- **Real-time Updates**: Volume levels update automatically
- **Search & Filter**: Quickly find apps by name

## Requirements

- Raycast for Windows (latest version)
- Windows 10 or Windows 11
- Optional: [NirCmd](https://www.nirsoft.net/utils/nircmd.html) or [SoundVolumeView](https://www.nirsoft.net/utils/sound_volume_view.html) for enhanced functionality

## Installation

1. Clone or download this extension
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development mode
4. The extension will be loaded in Raycast

## Usage

### Volume Mixer Command

1. Open Raycast (default: `Alt + Space`)
2. Search for "Volume Mixer"
3. Select an application from the list
4. Use keyboard shortcuts to adjust volume:
   - `Cmd + Up`: Increase volume by 5%
   - `Cmd + Down`: Decrease volume by 5%
   - `Cmd + M`: Toggle mute
   - `Cmd + 0-9`: Quick set volume (0%, 25%, 50%, 75%, 100%)

### Audio Devices Command

1. Open Raycast
2. Search for "Audio Devices"
3. Select a device and press Enter to set as default

## Enhancing with NirCmd

For the best experience, install NirCmd:

1. Download from: https://www.nirsoft.net/utils/nircmd.html
2. Extract `nircmd.exe` to a folder in your PATH
3. Update the audio-utils.ts to use NirCmd commands:

```typescript
// Set volume for specific process
exec("nircmd.exe setappvolume /pid " + processId + " " + (volume / 100));

// Toggle mute
exec("nircmd.exe muteappvolume /pid " + processId + " 2");

// Set default sound device
exec("nircmd.exe setdefaultsounddevice \"" + deviceName + "\"");
```

## Troubleshooting

### Apps not showing up?

Make sure the application is actively playing audio. Windows only tracks volume for apps with active audio sessions.

### Volume changes not applying?

Try running Raycast as administrator. Some applications require elevated permissions.

### Extension not loading?

Check the developer console in Raycast for errors. Make sure all dependencies are installed.

## License

MIT License - feel free to modify and distribute.
