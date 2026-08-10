# VLC Raycast Extension

> **Seamlessly control VLC Media Player from Raycast.**

## 🚀 Features

- **Play/Pause/Stop/Next/Previous**
- **Volume Up/Down, Mute, Unmute, Set Volume by Percentage**
- **Seek Forward/Backward**
- **Toggle Fullscreen, Loop, Random/Shuffle**
- **Eject Media**
- **Open Video (with optional Subtitle)**
- **Trigger VLsub (Subtitle Search) via AppleScript**
- **All commands available as quick Raycast actions**

## ⚡️ Quick Start

1. **Enable VLC HTTP Web Interface**
   - In VLC: Go to **VLC > Settings**
   - Open the **Interface** tab
   - Under **HTTP web interface**, check **Enable HTTP web interface**
   - Set a password in the **Password** field
   - Restart VLC

2. **Set Your VLC Password**
   - Open Raycast → Extensions → VLC → Set `VLC HTTP Password` in preferences

3. **Use Commands**
   - Search for "VLC" in Raycast and run any command
   - For volume: use `Set Volume by Percentage` and enter a value (0–125)

## 🛠️ Commands

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| Play / Pause / Stop     | Playback controls                     |
| Next / Previous         | Playlist navigation                   |
| Volume Up / Down        | Adjust volume in steps                |
| Mute / Unmute           | Mute or restore volume                |
| Set Volume by %         | Set exact volume (0–125%)             |
| Seek Forward / Backward | Jump in playback                      |
| Toggle Fullscreen       | Enter/exit fullscreen                 |
| Toggle Loop / Random    | Toggle loop or shuffle modes          |
| Eject                   | Eject current media                   |
| Open                    | Open a video (with optional subtitle) |
| Open VLsub              | Trigger VLsub subtitle search in VLC  |

## 🐞 Troubleshooting

- **VLC not responding?**
  - Ensure HTTP interface is enabled and VLC is running
  - Password must match Raycast preference
  - Check VLC is listening on `localhost:8080`
- **AppleScript errors?**
  - Make sure VLC is open and has the VLsub extension installed
  - Grant Raycast accessibility permissions in System Settings
- **Network issues?**
  - Firewall or VPN may block `localhost:8080`

## 💡 Tips

- Use Raycast hotkeys for instant VLC control
- Combine with Raycast workflows for automation
- Open with subtitle for dual-language viewing

## 📝 License

MIT
