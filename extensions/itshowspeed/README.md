# ItShowSpeed

[![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-red.svg)](https://www.raycast.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **Raycast** extension that displays real-time network upload and download speeds directly in your macOS menu bar.

Built with `@raycast/api`, `@raycast/utils`, and `pretty-bytes`.

## Features

- **Real‑time network speed** – Shows current upload (▲) and download (▼) throughput in the menu bar.
- **No polling overhead** – Uses a lightweight 10‑second refresh interval, configurable via the extension manifest.
- **Human‑readable formatting** – Bytes are automatically converted to appropriate units (e.g., KB/s, MB/s) using `pretty-bytes`.
- **macOS native** – Relies on `/usr/sbin/netstat -I en0 -b` to scrape raw interface byte counters.
- **Zero configuration** – Install and run; no API keys or setup required.

## How It Works

1. Every **10 seconds** the extension calls `netstat -I en0 -b` to read cumulative bytes received and sent on the primary network interface (`en0`).
2. The previous sample is cached alongside the current one.
3. It calculates the difference in bytes for both directions and divides by the elapsed time to derive **bytes per second**.
4. The result is formatted with `pretty-bytes` and displayed in the menu bar as:

   ```
   ▲ 1.2 MB/s   ▼ 340 KB/s
   ```

## Installation

### From the Raycast Store

1. Open **Raycast**.
2. Search for **"ItShowSpeed"**.
3. Install the extension.

### Manual / Development

```bash
# Clone the repository
git clone https://github.com/ZlatanCN/it-show-speed.git
cd it-show-speed

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Usage

After installation, the extension runs automatically as a **menu‑bar command**. You will see the upload/download speeds in your menu bar at the configured interval.

- **Upload** is indicated by **▲**.
- **Download** is indicated by **▼**.

If the label shows `--` for a direction, it means no sample data is available yet (first run) or the computed value was invalid (e.g., interface reset).

## Requirements

- **macOS** – The extension uses `/usr/sbin/netstat`, which is macOS‑only.
- **Raycast** – Requires the [Raycast](https://raycast.com) launcher.
- **Node.js 18+** – For manual development.

## Extension Configuration

The refresh interval can be adjusted in [`package.json`](./package.json):

```json
{
  "commands": [
    {
      "name": "index",
      "title": "ItShowSpeed Menubar",
      "mode": "menu-bar",
      "interval": "10s"
    }
  ]
}
```

Change the `interval` value to your preferred polling frequency (e.g., `"5s"`, `"30s"`).

## Project Structure

```
network-menubar-monitor/
├── assets/
│   └── it-show-speed-icon.png   # Menu bar icon
├── src/
│   ├── index.tsx                # Main menu‑bar command (React component)
│   └── utils.ts                 # Network data fetching & speed calculation
├── package.json                 # Extension manifest & dependencies
├── tsconfig.json                # TypeScript configuration
├── raycast-env.d.ts             # Auto‑generated Raycast type declarations
├── .eslintrc.json               # ESLint configuration
└── .prettierrc                  # Prettier formatting options
```

## Technical Details

### Data Source

The extension runs `/usr/sbin/netstat -I en0 -b` and parses the second line of output. Columns 6 and 9 represent:

- **Column 6** – Total bytes received (`Ibytes`).
- **Column 9** – Total bytes sent (`Obytes`).

These are cumulative counters that reset only when the interface is brought down.

### Speed Calculation

```
speed = (current_bytes - previous_bytes) / (time_elapsed_ms / 1000)
```

The result is passed to `pretty-bytes` for human‑readable formatting.

### Caching

`useCachedState` and `useCachedPromise` from `@raycast/utils` are used to persist the previous sample across command executions, enabling accurate delta calculations.

## Scripts

| Script        | Description                              |
|---------------|------------------------------------------|
| `npm run dev` | Launch the extension in development mode |
| `npm run build` | Build the extension for production     |
| `npm run lint`  | Lint the source code                   |
| `npm run fix-lint` | Auto‑fix lint issues               |
| `npm run publish` | Publish to the Raycast Store         |

## License

[MIT](./LICENSE) © gabriel.zhu
