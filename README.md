# Mouse Jiggle

A Raycast extension that jiggles the mouse cursor randomly to prevent your Mac from sleeping, keep Microsoft Teams status active, or any other purpose requiring periodic mouse movement.

## Features

- **Random movements** — Each jiggle uses 4 random offsets for natural, unpredictable motion
- **Works out of the box** — Uses Python with Quartz APIs as a fallback
- **cliclick support** — Optional but recommended for smoother movement
- **Minimal footprint** — Simple shell script, no dependencies required

## Requirements

- macOS
- Raycast
- **Optional:** [cliclick](https://www.bluem.net/jump/) for smoother mouse control

### Enabling Accessibility Permissions

If using the Python fallback, you may need to grant Accessibility permissions:

1. Go to **System Settings** → **Privacy & Security** → **Accessibility**
2. Click the lock icon to make changes
3. Add and enable your terminal app (Terminal, iTerm2, etc.)

## Installation

1. Open Raycast
2. Go to **Extensions** → **Import Extension**
3. Select the `mouse-jiggle` folder

## Usage

1. Press `⌘ + J` or search for "Mouse Jiggle"
2. The mouse moves randomly in 4 small bursts
3. Use with a cron job or automation to jiggle periodically

### Automating Regular Jiggles

#### Using launchd

Create `~/Library/LaunchAgents/com.user.mousejiggle.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.mousejiggle</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/zsh</string>
        <string>/path/to/mouse-jiggle/src/index.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>300</integer>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

Then:
```bash
launchctl load ~/Library/LaunchAgents/com.user.mousejiggle.plist
```

## How It Works

The script generates 4 random pixel offsets (between -10 and +10 for both x and y axes) and moves the mouse in 4 bursts.

### Movement Methods

| Method | Description |
|--------|-------------|
| **cliclick** | If installed, uses the [cliclick](https://www.bluem.net/jump/) CLI tool |
| **Python + Quartz** | Fallback using macOS's native CGEvent APIs |

## License

MIT License
