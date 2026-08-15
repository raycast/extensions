# Lemniscate | System Monitor

A Raycast extension for monitoring system performance on macOS and Windows. Get real-time CPU and memory usage information with a visual representation and a list of top processes.

## Features

- **Real-time System Monitoring**: View CPU and memory usage that updates every 2 seconds
- **Visual Metrics**: Custom SVG-based visualizations showing per-core CPU usage and memory consumption
- **Top Processes**: See the top 10 processes by CPU usage
- **Process Management**:
  - View detailed process information (PID, CPU %, Memory %)
  - Kill processes directly from Raycast
  - Copy PIDs to clipboard

## Installation

### From Raycast Store (Recommended)

1. Open Raycast
2. Search for "Lemniscate Monitor"
3. Click Install

### Manual Installation

1. Clone this repository:

   ```bash
   git clone <repository-url>
   cd lemniscate-monitor
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the extension:

   ```bash
   npm run build
   ```

4. Import the extension in Raycast:
   - Open Raycast preferences
   - Go to Extensions
   - Click the "+" button
   - Select "Add Script Directory"
   - Choose this project's directory

## Development

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Raycast installed on your system

### Setup

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Run linter
npm run lint

# Fix linting issues automatically
npm run fix-lint
```

### Project Structure

```
lemniscate-monitor/
├── src/
│   ├── show-information.tsx    # Main command implementation
├── package.json               # Project configuration
├── tsconfig.json             # TypeScript configuration
├── eslint.config.js          # ESLint configuration
└── README.md                # This file
```

## Usage

1. Open Raycast (⌘ + Space by default)
2. Type "Show System Information" or "Lemniscate Monitor"
3. View real-time system metrics and processes

### Available Actions

- **Kill Process**: Force quit a running process (⚠️ use with caution)
- **Copy PID**: Copy the process ID to your clipboard

## Technologies Used

- **[Raycast API](https://developers.raycast.com/)**: Extension framework
- **[systeminformation](https://github.com/sebhildebrandt/systeminformation)**: System and hardware information library
- **TypeScript**: Type-safe development
- **React**: UI components

## License

MIT

## Author

Zhassulan Abdrakhmanov

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

If you encounter any issues or have suggestions, please file an issue on the repository.

---

Made with ❤️ for the Raycast community
