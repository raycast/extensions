# LIFX Raycast Extension

Control your LIFX smart lights directly from Raycast with local network discovery and cloud API fallback.

![LIFX Extension](assets/extension-icon.png)

## Features

### 🤖 Natural Language Control
- **Type Commands Naturally**: Control your lights by typing commands like "set to electric blue and make it cozy"
- **Incredibly Smart Parsing**: Recognizes 80+ colors, 50+ brightness levels, 30+ temperature keywords
- **Compound Commands**: Chain multiple actions together (e.g., "turn on, set to pastel pink, and dim a bit")
- **Conversational**: Say it however feels natural - "gimme some light", "make it super bright", "barely on night light"
- **Profile Integration**: Load saved profiles by name or tag (e.g., "switch to my sleep mode")
- **Keyboard Shortcut**: Press `Ctrl+Enter` to execute your command

### 🚀 Smart Connection
- **LAN-First Discovery**: Fast local network control (no internet required)
- **HTTP API Fallback**: Automatic fallback to cloud API if LAN unavailable
- **Auto-Detection**: Discovers all LIFX lights on your network within seconds

### 💡 Comprehensive Light Control
- **Power**: Toggle lights on/off
- **Brightness**: 7 preset levels from 1% to 100%
- **Color**: 9 preset colors with emoji indicators (🔴 Red, 🟢 Green, 🔵 Blue, etc.)
- **Temperature**: 8 white temperature presets (2500K - 9000K)
- **Scenes**: 9 one-click mood scenes (Warm Relax, Reading, Energize, Night, etc.)

### 📦 Profile Management
- Save current light states as profiles
- Load saved profiles instantly
- Built-in profile management (save/load/delete)

### 🎯 Bulk Operations
- Control all lights simultaneously
- Turn all lights on/off together
- Set all lights to same brightness

### ⌨️ Keyboard Shortcuts
All actions have keyboard shortcuts for maximum efficiency:

#### Individual Light Control
- `Cmd+Shift+P` - Toggle power
- `Cmd+Shift+B` - Set brightness
- `Cmd+Shift+C` - Set color
- `Cmd+Shift+T` - Set temperature
- `Cmd+Shift+S` - Save as profile
- `Cmd+Shift+L` - Load profile

#### Quick Brightness
- `Cmd+1` - 100% brightness
- `Cmd+2` - 75% brightness
- `Cmd+3` - 50% brightness
- `Cmd+4` - 25% brightness

#### Color Scenes
- `Cmd+Shift+1-9` - Apply color scenes (Red, Green, Blue, Yellow, etc.)

#### All Lights Control
- `Cmd+Shift+O` - Turn all lights on
- `Cmd+Shift+X` - Turn all lights off
- `Cmd+Shift+1-4` - Set all lights to preset brightness

#### Other
- `Cmd+R` - Refresh lights list

## Installation

### Requirements
- [Raycast](https://www.raycast.com/) installed
- LIFX smart lights on your network
- Node.js 18+ (for development)

### From Source

1. Clone this repository:
```bash
git clone https://github.com/luinbytes/lifx.git
cd lifx
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Import into Raycast:
```bash
npm run dev
```

## Configuration

### LAN Discovery (Recommended)
No configuration needed! The extension will automatically discover LIFX lights on your local network.

### HTTP API Token (Optional Fallback)
If LAN discovery fails or you want remote control, you can add an HTTP API token:

1. Go to [https://cloud.lifx.com/settings](https://cloud.lifx.com/settings)
2. Sign in with your LIFX account
3. Click "Generate New Token"
4. Copy the token
5. Open Raycast → LIFX extension → Preferences
6. Paste your token in "LIFX HTTP API Token"

### Preferences

- **LIFX HTTP API Token**: Optional token for HTTP API fallback
- **Default Fade Duration**: How long light transitions take (default: 1000ms)
- **LAN Discovery Timeout**: How long to wait for local network discovery (default: 5000ms)
- **Enable LAN Discovery**: Toggle local network discovery on/off

## Usage

### Natural Language Commands
The easiest way to control your lights is with natural language:

1. Open Raycast
2. Search for "LIFX Dashboard"
3. Type your command in the search bar
4. Press `Ctrl+Enter` to execute

**Example Commands:**

*Power & Basic*
- `turn on` / `lights on` / `gimme light` - Turn on lights
- `lights off` / `darkness` / `make it dark` - Turn off lights

*Colors (80+ recognized!)*
- `set to red` / `electric blue` / `neon pink` - Basic colors
- `deep blue` / `pale green` / `pastel pink` - Color variations
- `sapphire` / `emerald` / `crimson` / `amber` - Named colors
- `baby blue` / `hot pink` / `forest green` - Descriptive colors

*Brightness (50+ keywords!)*
- `super bright` / `max brightness` / `brightest` - Maximum
- `dim a bit` / `pretty dim` / `quite dim` - Decrease
- `night light` / `barely on` / `barely lit` - Very low
- `75%` / `half` / `medium` - Specific levels

*Temperature (30+ moods!)*
- `warm white` / `cozy` / `relaxing` / `sunset` - Warm
- `cool white` / `energizing` / `focus` - Cool
- `daylight` / `morning` / `sunshine` - Bright
- `candlelight` / `warm glow` - Atmospheric

*Compound Commands*
- `turn on and set to blue` - Multiple actions
- `electric blue and super bright` - Color + brightness
- `cozy and dim a bit` - Temperature + brightness
- `all lights to pastel pink and half brightness` - Complex

*Profiles*
- `load my sleep mode` / `switch to sleep mode` - By name
- `gimme my work preset` / `use the relax scene` - Casual

### Control Individual Lights
1. Open Raycast
2. Search for "LIFX Dashboard"
3. Select a light
4. Use actions to control it:
   - Power on/off
   - Set brightness, color, or temperature
   - Apply preset scenes
   - Save/load profiles

### Control All Lights
When you have multiple lights, an "All Lights" section appears at the top:
- Turn all lights on/off
- Set all to same brightness
- Quick access via keyboard shortcuts

### Save & Load Profiles
1. Set your lights to desired state
2. Press `Cmd+S` on a light
3. Name your profile
4. Later, press `Cmd+L` to load saved profiles

## Troubleshooting

### No Lights Discovered
- Ensure your LIFX lights are powered on
- Check that your computer is on the same network as your lights
- Try increasing the LAN Discovery Timeout in preferences
- Add an HTTP API token as fallback

### Lights Not Responding
- Check if lights are reachable on your network
- Try refreshing the lights list (`Cmd+R`)
- The extension will automatically try HTTP API if LAN fails

### UI Not Updating
- This has been fixed in the latest version
- Make sure you're running the latest build

## Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Lint
```bash
npm run lint
```

### Fix Linting Issues
```bash
npm run fix-lint
```

## Tech Stack

- **Raycast API**: Extension framework
- **lifx-lan-client**: Local network control (LAN protocol)
- **lifxjs**: HTTP API control (cloud fallback)
- **TypeScript**: Type safety and better DX
- **React**: UI components

## Project Structure

```
src/
├── dashboard.tsx                 # Main dashboard command
├── save-profile.tsx              # Save profile command
├── load-profile.tsx              # Load profile command
├── manage-profiles.tsx           # Manage profiles command
├── lib/
│   ├── lifx-client.ts            # Connection manager (LAN + HTTP)
│   ├── lifx-lan.ts               # LAN client wrapper
│   ├── lifx-http.ts              # HTTP client wrapper
│   ├── nlp-parser.ts             # Natural language parser
│   ├── storage.ts                # Profile storage
│   └── types.ts                  # TypeScript interfaces
├── components/
│   ├── LightListItem.tsx         # Light list item with actions
│   ├── LightGridItem.tsx         # Light grid item with actions
│   ├── BrightnessControl.tsx     # Brightness picker
│   ├── ColorPicker.tsx           # Color picker
│   └── TemperatureControl.tsx    # Temperature picker
└── utils/
    └── validation.ts             # Input validation
```

## Architecture

### Connection Strategy
1. **LAN First**: Attempts local network discovery (fast, no internet)
2. **HTTP Fallback**: Uses cloud API if LAN unavailable
3. **Auto-Deduplication**: Merges lights from both sources
4. **Smart Failover**: Switches between LAN/HTTP automatically on failure

### Data Flow
```
User Action → LIFXClientManager → Try LAN → If fail, try HTTP → Update UI
```

## License

MIT

## Author

Created by nazzy_wazzy_lu

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- [LIFX](https://www.lifx.com/) for making awesome smart lights
- [Raycast](https://www.raycast.com/) for the amazing launcher platform
- [lifx-lan-client](https://github.com/node-lifx/lifx-lan-client) for the LAN protocol implementation
- [lifxjs](https://github.com/thanoskrg/lifxjs) for the HTTP API wrapper

---

**Enjoy controlling your lights! 💡✨**
