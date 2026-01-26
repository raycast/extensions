# GCP IP Search

A Raycast extension to quickly search for IP addresses across all your Google Cloud Platform projects.

## Features

- 🔍 **Fast Search**: Searches across all your GCP projects in parallel
- 📊 **Rich UI**: Beautiful list interface with detailed metadata
- 🚀 **Quick Actions**: Open GCP Console, copy IP/names with keyboard shortcuts
- 🎯 **Smart Filtering**: Filter results by status, project, name, or region
- 👻 **Ephemeral IP Support**: identifying ephemeral IPs vs static reserved IPs
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
   cd /path/to/google-cloud-platform-find-ip
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start development mode:

   ```bash
   npm run dev
   ```

4. Open Raycast and search for "Find IP Address"

### For Publishing

Once you're ready to publish to the Raycast Store:

```bash
npm run publish
```

Follow the prompts to submit your extension.

## Usage

1. Open Raycast (⌘ + Space)
2. Type "Find IP Address"
3. Enter the IP address you want to search for
4. Press Enter

The extension will:

- Search across all your GCP projects
- Show results in real-time as they're found
- Display resource details (type, region/zone, status)
- Allow you to locally filter results (e.g., type "running" to see only running instances)

### Keyboard Shortcuts

- `⌘ + O` - Open in GCP Console
- `⌘ + C` - Copy IP Address
- `⌘ + Shift + C` - Copy Resource Name
- `⌘ + Shift + P` - Copy Project ID
- `⌘ + Shift + U` - Copy Console URL

## What It Searches

The extension searches for IPs in:

- **Forwarding Rules**: Load balancer IPs
- **Addresses**: Reserved/static IP addresses
- **Compute Instances**: VM internal and external IPs (including ephemeral IPs)

## Development

### Project Structure

```
google-cloud-platform-find-ip/
├── src/
│   ├── search-ip.tsx  # Main command UI
│   └── utils.ts       # GCP CLI utilities
├── assets/
│   └── icon.png       # Extension icon
├── package.json       # Extension manifest
└── tsconfig.json      # TypeScript config
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

- Email: 880831ian@gmail.com

## License

MIT License - feel free to use and modify as needed!
