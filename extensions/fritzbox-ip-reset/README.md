# Fritz!Box IP Reset

A Raycast extension to quickly reset your Fritz!Box router's IP connection and get a new public IP address.

## Features

- One-click IP reset via SOAP/UPnP request to Fritz!Box
- Configurable Fritz!Box URL and timeout
- Toast notifications for success/failure
- Automatic fallback to multiple URL paths (same as original VBS script)
- Better error handling and user feedback

## Requirements

- Fritz!Box router (tested with common models)
- Connection to the Fritz!Box network
- UPnP enabled on your Fritz!Box (usually enabled by default)

## Installation

1. Clone or download this extension
2. Navigate to the extension directory
3. Run `npm install && npm run dev`

## Usage

1. Open Raycast
2. Search for "Reset IP"
3. Press Enter
4. Your Fritz!Box will reconnect and obtain a new IP address

## Configuration

You can configure the following preferences in Raycast settings:

- **Fritz!Box URL**: The URL of your Fritz!Box router (default: `http://fritz.box:49000`)
- **Request Timeout**: Timeout for the HTTP request in milliseconds (default: `5000`)

## How It Works

This extension sends a SOAP request to your Fritz!Box router using the UPnP `ForceTermination` action on the `WANIPConnection` service. This forces the router to disconnect and reconnect, obtaining a new public IP address from your ISP.

The extension:
1. Sends a SOAP XML request to the Fritz!Box UPnP endpoint
2. Tries multiple URL paths (with and without "igd" prefix) for compatibility
3. Shows a success toast when the IP reset is initiated
4. Provides detailed error messages if the connection fails

## Improvements Over Original VBS Script

- **Cross-platform**: Works on macOS and Windows (VBS was Windows-only)
- **Better UX**: Toast notifications with clear success/error messages
- **Configurable**: Preferences for URL and timeout
- **Modern**: Uses TypeScript and modern web APIs (fetch)
- **Error handling**: Detailed error messages with troubleshooting steps
- **Quick access**: Launch instantly from Raycast

## Troubleshooting

If the IP reset fails, check:

1. You are connected to your Fritz!Box network
2. The Fritz!Box URL is correct (try accessing it in a browser)
3. UPnP is enabled in Fritz!Box settings (Home Network > Network > Network Settings)
4. Your Fritz!Box supports the WANIPConnection service (most modern models do)

## License

MIT
