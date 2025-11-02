> DISCLAIMER: This extension was created with the help of Claude Code

# Plinky for Raycast

Save links to Plinky directly from Raycast with a simple keyboard shortcut.

## Features

- Save any URL to your Plinky account instantly
- Fast keyboard-driven workflow
- Secure API key storage in Raycast preferences
- Success/error notifications
- Minimal interface - just paste and save

## Prerequisites

- macOS with Raycast installed
- Node.js 16 or later
- A Plinky account with API access
- Your Plinky ID (API Key) from Plinky Settings

## Installation

### Step 1: Get Your Plinky ID

1. Open the Plinky app (iOS or Mac)
2. Navigate to **Settings**
3. Find and copy your **Plinky ID** (format: `ID` + 30 alphanumeric characters)
4. Keep this handy - you'll need it in Step 4

### Step 2: Install Dependencies

```bash
cd ~/path/to/plinky-extension
npm install
```

### Step 3: Add Extension Icon

**Required**: Create a 512x512 PNG icon at `assets/command-icon.png`

Quick options:
- Use [Favicon Generator](https://favicon.io/favicon-generator/) to create a simple "P" icon
- Export from SF Symbols app (search for "link" or "bookmark")
- Use any 512x512 PNG image

### Step 4: Import to Raycast

```bash
npm run dev
```

This opens Raycast and imports the extension in development mode.

### Step 5: Configure Your API Key

After importing:

1. Raycast will prompt for your Plinky ID on first use
2. **Or** open Raycast Settings → Extensions → Plinky → Configure
3. Paste your Plinky ID
4. Optionally customize the Integration Name (default: "Raycast")

## Usage

### Basic Usage

1. Open Raycast (`⌘ + Space`)
2. Type "Save Link to Plinky" or search for "plinky"
3. Paste or type the URL
4. Press `Enter`

A success notification confirms the link was saved.

### Set a Custom Hotkey

For faster access:

1. Find "Save Link to Plinky" in Raycast
2. Press `⌘ + K` to open actions
3. Select "Create Hotkey" or "Create Quicklink"
4. Assign your preferred keyboard shortcut
5. Now use your hotkey to open the command instantly

### Example Workflow

```
⌘ + Space → type "plinky" → paste URL → Enter
```

Or with a custom hotkey:
```
⌥ + ⌘ + P → paste URL → Enter
```

## File Structure

```
plinky-extension/
├── package.json              # Extension manifest and dependencies
├── tsconfig.json             # TypeScript configuration
├── README.md                 # This file
├── assets/
│   └── command-icon.png      # 512x512 PNG icon (required)
└── src/
    └── saveLink.tsx          # Main command code
```

## Troubleshooting

### "Could not find manifest extension file"

**Cause**: Missing icon file

**Fix**: Add a 512x512 PNG at `assets/command-icon.png`

### "Could not find an entry point for the command"

**Cause**: File structure mismatch

**Fix**: Ensure you have `src/saveLink.tsx` (not in a subfolder)

### "Invalid Integrations API key"

**Causes & Solutions**:
- Verify your Plinky ID is correct (starts with "ID" + 30 characters)
- Check you copied the entire key without extra spaces
- Try regenerating your API key in Plinky Settings
- Ensure the key matches your logged-in Plinky account

### Link saved but doesn't appear in Plinky app

**Mac app sync issue**: Links save successfully but may not sync to Mac app immediately

**Solutions**:
- Check on iOS - links usually appear there first
- Force quit and reopen the Plinky Mac app
- Log out and back into the Mac app
- Contact Plinky support if issue persists

### Rate limit exceeded

**Cause**: API allows 1,000 requests per 24 hours

**Fix**: Wait 24 hours or contact Plinky support (joe@redpanda.club) for increased limits

## API Details

### Endpoint

```
POST https://api.plinky.app/link
```

### Headers

```
X-PLINKY-API-KEY: Your Plinky ID
X-PLINKY-API-VERSION: 2024-02-29
X-PLINKY-INTEGRATION-NAME: Raycast
Content-Type: application/json
```

### Request Body

```json
{
  "url": "https://example.com"
}
```

### Response

```json
{
  "id": "unique-link-id",
  "originalURL": "https://example.com",
  "resolvedURL": "https://example.com",
  "tags": [],
  "collection": null,
  "createdAt": "2025-11-02T19:00:00Z",
  "updatedAt": "2025-11-02T19:00:00Z"
}
```

### Rate Limits

- 1,000 requests per 24 hours per API key
- Applies to all endpoints combined
- Contact Plinky for increased limits if needed

## Known Limitations

### Tags and Folders Not Supported

The Plinky API currently does not support adding tags or folders during link creation, even though these fields are accepted in requests. This is a limitation of the Plinky API, not this extension.

**Workaround**: Organize links manually in the Plinky app after saving them via Raycast.

## Development

### Making Changes

1. Edit `src/saveLink.tsx`
2. Changes auto-reload in development mode
3. Test thoroughly before building

### Building for Production

```bash
npm run build
```

The built extension will be in the `dist/` folder.

### Publishing to Raycast Store

```bash
npm run publish
```

This creates a pull request to the [Raycast Extensions](https://github.com/raycast/extensions) repository.

## Technical Stack

- **Runtime**: Raycast Extension Environment
- **Language**: TypeScript
- **Framework**: React (via Raycast API)
- **API Client**: Native Fetch API
- **Dependencies**: @raycast/api, @raycast/utils

## Support

### Plinky API Issues

- Documentation: [plinky.app/docs/integrations-api](https://plinky.app/docs/integrations-api)
- Support: joe@redpanda.club

### Raycast Extension Issues

- Documentation: [developers.raycast.com](https://developers.raycast.com)
- Community: [Raycast Slack](https://raycast.com/community)

### This Extension

For bugs or feature requests related to this extension, please open an issue in the repository.

## License

MIT

## Changelog

### [1.0.0] - 2025-11-02

**Added**
- Initial release
- Save links to Plinky with URL input
- Secure API key configuration via Raycast preferences
- Success and error toast notifications
- Clean error handling

**Known Issues**
- Tags and folders cannot be added via API (Plinky API limitation)
- Mac app may have sync delays (use iOS app for immediate verification)

## Acknowledgments

- Built for [Plinky](https://plinky.app) by Red Panda Club
- Uses the [Raycast Extensions API](https://developers.raycast.com)
- Inspired by the need for faster link saving workflows