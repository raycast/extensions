# Wallpaper Engine

Control Wallpaper Engine directly from Raycast.

## Requirements

- **Windows**: This extension only works on Windows because Wallpaper Engine is a Windows-only application.
- **Wallpaper Engine**: Must be installed via Steam.

## Setup

The extension automatically detects your Wallpaper Engine installation by looking for it in your Steam library folders. If detection fails, you can manually set the path in the extension preferences:

1. Open Raycast Preferences
2. Go to Extensions → Wallpaper Engine
3. Set the **Wallpaper Engine Path** to the directory containing `wallpaper32.exe` or `wallpaper64.exe`

Example path: `C:\Program Files (x86)\Steam\steamapps\common\wallpaper_engine`

## Commands

- **Pause All Wallpapers** — Pause all active wallpapers
- **Play All Wallpapers** — Resume all wallpapers from pause or stop
- **Stop All Wallpapers** — Stop all wallpapers
- **Mute All Wallpapers** — Mute all wallpaper audio
- **Unmute All Wallpapers** — Unmute all wallpaper audio
- **Hide Desktop Icons** — Hide desktop icons
- **Show Desktop Icons** — Show desktop icons
- **Next Wallpaper** — Skip to the next wallpaper on a monitor
- **Close Wallpaper** — Remove wallpaper from a monitor
- **Get Current Wallpaper** — Show current wallpaper for each monitor
- **Open Wallpaper** — Open a specific wallpaper on a monitor
- **Open Playlist** — Open a saved playlist on a monitor
- **Open Profile** — Apply a saved display profile
- **Apply Properties** — Apply wallpaper settings dynamically via JSON

## Troubleshooting

If the extension cannot find Wallpaper Engine, ensure:

- Wallpaper Engine is installed via Steam
- The Steam library is accessible (not on an external drive that is disconnected)
- Or set the manual path in the extension preferences

## Support

If you encounter issues or have feature requests, please open an issue on the [Raycast Extensions repository](https://github.com/raycast/extensions).
