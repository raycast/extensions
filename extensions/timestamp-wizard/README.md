# TimeStamp Wizard

> A Raycast extension that converts between timestamps and date formats instantly.

<img src="./assets/extension-icon.png" width="64" alt="TimeStamp Wizard Icon" />

## Features

- **Real-time Conversions**: Convert between Unix timestamps and various date formats on the fly
- **Current Time Display**: Shows current time and timestamp when opened
- **Multiple Date Formats**: Support for various date formats (ISO, regional formats, etc.)
- **Live Updates**: Current time updates automatically every second
- **Copy to Clipboard**: Easily copy any timestamp or formatted date with a single press of Return

## Usage

### Converting Timestamp to Date

1. Enter a timestamp in seconds (e.g., `1715558400`) or milliseconds in the search bar
2. See multiple formatted date representations
3. Press Return on any result to copy it to clipboard

### Converting Date to Timestamp

1. Enter a date in various formats (e.g., `2024-05-13 15:00` or `05/13/2024`)
2. See Unix timestamps in seconds, milliseconds, and ISO 8601 format
3. Press Return on any result to copy it to clipboard

### Supported Date Formats

- `yyyy-MM-dd HH:mm:ss` (e.g., 2024-05-13 15:00:00)
- `yyyy-MM-dd HH:mm` (e.g., 2024-05-13 15:00)
- `yyyy/MM/dd HH:mm:ss` (e.g., 2024/05/13 15:00:00)
- `yyyy/MM/dd HH:mm` (e.g., 2024/05/13 15:00)
- `yyyy年MM月dd日 HH:mm:ss` (e.g., 2024年05月13日 15:00:00)
- `yyyy年MM月dd日 HH:mm` (e.g., 2024年05月13日 15:00)
- `MM/dd/yyyy HH:mm:ss` (e.g., 05/13/2024 15:00:00)
- `MM/dd/yyyy HH:mm` (e.g., 05/13/2024 15:00)
- `dd/MM/yyyy HH:mm:ss` (e.g., 13/05/2024 15:00:00)
- `dd/MM/yyyy HH:mm` (e.g., 13/05/2024 15:00)
- ISO 8601 format (e.g., 2024-05-13T15:00:00.000Z)

## Installation

### From Raycast Store

1. Open Raycast
2. Search for "Store"
3. Type "TimeStamp Wizard" in the Raycast Store
4. Click "Install"

### Manual Installation

1. Clone this repository
2. Run `npm install` or `pnpm install` to install dependencies
3. Run `npm run dev` or `pnpm run dev` to start development mode
4. The extension should now be available in Raycast

## Development

This extension is built with:
- [Raycast API](https://developers.raycast.com/)
- [React](https://reactjs.org/)
- [date-fns](https://date-fns.org/) for date manipulation

To contribute:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ for Raycast
