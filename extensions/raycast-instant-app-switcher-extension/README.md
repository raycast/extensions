# Instant App Switcher for Raycast

A blazingly fast macOS application switcher extension for [Raycast](https://raycast.com) with customizable hotkeys and intelligent sorting.

## Features

- 🚀 **Lightning Fast** - Optimized for speed with 5ms app detection
- ⌨️ **Custom Hotkeys** - Assign single or multi-character hotkeys to your favorite apps
- 🎯 **Smart Sorting** - Recently used apps appear first, then running apps
- 🔍 **Fuzzy Search** - Find apps quickly with space + search term
- 📱 **Real App Icons** - Displays actual macOS application icons
- 💾 **Persistent Storage** - Hotkeys and history survive between sessions
- ⚡ **Instant Switching** - Type a hotkey to switch immediately

## Installation

### From Source

1. Clone this repository:
```bash
git clone https://github.com/stasmarkin/raycast-instant-app-switcher-extension.git
cd raycast-instant-app-switcher-extension
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
   - Open Raycast
   - Go to Extensions
   - Click "+" → "Add Local Extension"
   - Select the project directory

## Usage

### Basic Usage

1. Open Raycast (default: `Cmd + Space`)
2. Type "Select Appliction" or your custom alias
3. Browse through your applications:
   - **Recent apps** appear first
   - **Running apps** are marked with "Running"
   - **All installed apps** are shown below

### Hotkey Switching

1. **Assign a Hotkey**:
   - Select an app from the list
   - Press `Cmd + H`
   - Enter a hotkey (e.g., `ff` for Firefox, `fi` for Figma)
   - Press Enter

2. **Use Hotkeys**:
   - Open the extension
   - Type your hotkey (e.g., `ff`)
   - App switches instantly!

3. **Remove Hotkeys**:
   - Select an app with a hotkey
   - Press `Cmd + R`

### Search Mode

- Type `Space` followed by search term
- Example: `␣fire` → Firefox
- Example: `␣vsc` → Visual Studio Code
- Supports abbreviations and partial matches

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Switch to selected app |
| `Cmd + H` | Assign hotkey to app |
| `Cmd + R` | Remove hotkey from app |
| Single character | Switch via hotkey (if assigned) |
| `Space + text` | Search apps by `text` term |

## How It Works

### Performance Optimizations

- Uses `lsappinfo` for ultra-fast running app detection (~5ms)
- Caches installed apps for 3 minutes
- 50ms timeout for app scanning to prevent UI blocking

### Intelligent Sorting

Apps are sorted by:
1. **Recently used** - Last 25 apps you switched to
2. **Running status** - Currently running applications
3. **Alphabetically** - All other apps

### Hotkey Conflict Prevention

The extension automatically prevents conflicts:
- E.g. can't assign `ff` if `f` exists
- Bidirectional conflict detection

## Development

### Prerequisites

- Node.js 18+
- Raycast installed on macOS
- npm or yarn

### Commands

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

### Project Structure

```
raycast-instant-app-switcher-extension/
├── src/
│   └── switch-apps.tsx    # Main extension code
├── assets/
│   └── command-icon.png   # Extension icon
├── package.json           # Project metadata
├── tsconfig.json         # TypeScript config
└── README.md            # This file
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Code Style

- Follow existing code conventions
- Use TypeScript for type safety
- Keep functions small and focused
- Add comments for complex logic

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [Raycast Extensions API](https://developers.raycast.com/)
- Inspired by the need for faster app switching on macOS

## Support

If you encounter any issues or have suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Provide detailed reproduction steps

---

Made with ❤️ for the Raycast community