# Chrome Profile Switcher 🌐

A Raycast extension to quickly switch between Google Chrome profiles and open new windows.

## Features

- 📋 Lists all your Chrome profiles with their actual names
- 🎨 Shows profile icons with colors
- ⚡ Fast and intuitive search
- 🪟 Opens a new Chrome window with the selected profile
- ⌨️ Keyboard shortcuts for quick access

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/blakecodes/RaycastChromeSwitcher.git
   cd RaycastChromeSwitcher
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. The extension will now appear in your Raycast!

## Usage

1. Open Raycast (⌘ + Space or your configured hotkey)
2. Type "Switch Chrome Profile" or just "cp"
3. Select the profile you want to open
4. A new Chrome window will open with that profile

### Keyboard Shortcuts

- `Enter` - Open the selected profile in a new Chrome window
- `⌘ + C` - Copy the profile directory name to clipboard

## Requirements

- [Raycast](https://www.raycast.com/) (macOS app)
- [Google Chrome](https://www.google.com/chrome/)
- Node.js 20+ (for development)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## How It Works

The extension reads Chrome's profile information from:
```
~/Library/Application Support/Google/Chrome/Local State
```

It parses the profile metadata and displays all available profiles with their names and icons. When you select a profile, it opens Chrome with the `--profile-directory` flag to launch that specific profile.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Blake Connally** - [@blakecodes](https://github.com/blakecodes)

## Acknowledgments

- Built with [Raycast API](https://developers.raycast.com/)
- Icon extracted from Google Chrome

