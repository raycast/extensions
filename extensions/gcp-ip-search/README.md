# GCP IP Search

A Raycast extension to quickly search for IP addresses across all your Google Cloud Platform projects.

[View Source Code](https://github.com/880831ian/raycast-gcp-ip-search)

## Features

- 🔍 **Search Modes**:
  - **Quick**: Stops after first match (Fastest)
  - **Detailed**: Scans all projects
  - **Custom**: Scans selected projects only
- 📊 **Rich UI**: Beautiful list interface with detailed metadata
- 🕒 **Search History**: Quickly access your recent searches
- 🔄 **Recursive Search**: Easily search for internal/external IPs found in instance details
- 🚀 **Quick Actions**: Open GCP Console, copy IP/names with keyboard shortcuts
- 🎯 **Smart Filtering**: Filter results by status, project, name, or region
- 👻 **Ephemeral IP Support**: Identifying ephemeral IPs vs static reserved IPs
- ✅ **Validation**: Validates IPv4 and IPv6 formats before searching
- 💡 **Real-time Progress**: See results as they're found

## Prerequisites

Before using this extension, you need:

1. **gcloud CLI** installed:

   ```bash
   brew install google-cloud-sdk
   ```

2. **Authenticated** with GCP:

   ```bash
   gcloud auth login
   ```

3. **Node.js** (v18 or later) installed

## Installation

### For Development

1. Clone this repository:

   ```bash
   cd /path/to/raycast-gcp-ip-search
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development mode:

   ```bash
   npm run dev
   ```

4. Open Raycast and search for "Search IP Address"

### For Publishing

Once you're ready to publish to the Raycast Store:

```bash
npm run publish
```

Follow the prompts to submit your extension.

## Usage

1. Open Raycast (⌘ + Space)
2. Type "Search IP Address"
3. **Welcome Screen**:
   - **Quick / Detailed Mode**: Press `Cmd + M` to switch modes. `Enter` does nothing to prevent accidental switching.
   - **Custom Mode**: Press `Enter` to configure your custom project list.
4. **Search**: Enter the IP address you want to search for and press Enter.
5. **History**: Your recent searches are saved. You can select a history item to view its results again without rescanning.

The extension will:

- Search across all your GCP projects
- Show results in real-time as they're found
- Display resource details (type, region/zone, status)
- Allow you to locally filter results (e.g., type "running" to see only running instances)

### Keyboard Shortcuts

- `Enter` - Open in GCP Console (in result view) / Configure Custom Projects (in Custom Mode Welcome view)
- `⌘ + Enter` - Copy GCP Console URL
- `⌘ + D` - Toggle Details View
- `⌘ + M` - Cycle Search Modes (Quick -> Detailed -> Custom)
- `⌘ + Shift + P` - Configure Custom Projects (Only in Custom Mode)
- `⌘ + X` - Remove from History

## What It Searches

The extension searches for IPs in:

- **Forwarding Rules**: Load balancer IPs (Global & Regional)
- **Addresses**: Reserved/static IP addresses
- **Compute Instances**: VM internal and external IPs (including ephemeral IPs)
- **Cloud Routers**: Routers using specific IP addresses

## Development

### Project Structure

```
raycast-gcp-ip-search/
├── src/
│   ├── search-ip.tsx    # Main command UI
│   ├── utils.ts         # GCP CLI utilities
├── assets/
│   └── icon.png         # Extension icon
├── package.json         # Extension manifest
└── tsconfig.json        # TypeScript config
```

### Available Scripts

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build the extension
- `npm run lint` - Lint the code
- `npm run fix-lint` - Auto-fix linting issues
- `npm run publish` - Publish to Raycast Store

## Troubleshooting

### "gcloud CLI not found"

Make sure gcloud is installed and in your PATH:

```bash
which gcloud
# Should output: /usr/local/bin/gcloud or similar
```

### "No GCP projects found"

Ensure you're authenticated:

```bash
gcloud auth list
# Should show your account
```

Try listing projects manually:

```bash
gcloud projects list
```

### Extension not showing in Raycast

1. Make sure `npm run dev` is running
2. Check for errors in the terminal
3. Try reloading Raycast (⌘ + R in any Raycast window)

## Author

**Pin-Yi**

- Website: https://pin-yi.com

## License

MIT License - feel free to use and modify as needed!

## Repository

[https://github.com/880831ian/raycast-gcp-ip-search](https://github.com/880831ian/raycast-gcp-ip-search)
