# Time Calculator for Raycast

A beautiful and efficient time calculator extension for Raycast that allows you to quickly calculate total hours from multiple time entries.

![Time Calculator Icon](assets/preview.png)

## Features

- 🕐 **Flexible Input Formats**:
  - Time format: `HH:MM` (e.g., `8:30`)
  - Decimal format: `XX.XXX` (e.g., `8.5`)
- 🔄 **Real-time Calculation**: See your total update as you type
- 📊 **Dual Display**: Shows total in both time and decimal formats
- ⌨️ **Keyboard Shortcuts**:
  - `⌘+C` - Copy total to clipboard
  - `⌘+Shift+Delete` - Clear all entries
  - `⌘+N` - Add more lines
- 🌈 **Beautiful Icons**: Custom rainbow-themed icons for both light and dark modes
- ✅ **Smart Validation**: Helpful error messages for invalid inputs

## Installation

### From Raycast Store (Coming Soon)
Search for "Time Calculator" in the Raycast Store.

### Manual Installation
1. Clone this repository
2. Run `npm install`
3. Run `npm run dev`
4. The extension will appear in Raycast

## Usage

1. Open Raycast (`⌘+Space`)
2. Search for "Calculate Time"
3. Enter your time values in any combination of formats:
   - `8:30` (8 hours and 30 minutes)
   - `2.5` (2.5 hours = 2 hours and 30 minutes)
4. See the total automatically calculated at the top
5. Use keyboard shortcuts for quick actions

## Examples

```
Entry 1: 8:30
Entry 2: 2.25
Entry 3: 1:45
Entry 4: 3.5

Total: 16:00 (16.000 hours)
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created by [@marcswan](https://github.com/marcswan)

## Acknowledgments

- Built with [Raycast API](https://developers.raycast.com)
- Rainbow icon design inspired by the beauty of calculations 🌈

---

Made with ❤️ for the Raycast community
