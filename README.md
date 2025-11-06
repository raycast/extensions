# RG Adguard Links

Generate direct download links for Microsoft Store apps using store.rg-adguard.net.

## Features

- Automatically generates download links from Microsoft Store URLs, app names, or product IDs
- Fetches and displays all available download files with metadata  
- Shows file sizes, expiry dates, and SHA-1 checksums
- Copy or paste download URLs directly
- Open links in browser or copy SHA-1 for verification

## Usage

1. Launch Raycast
2. Search for "Get Download Links"
3. Enter a Microsoft Store app name, Product ID, or URL
4. Press Enter to open the lookup page, or use Generate Download Links to fetch files automatically
5. Browse generated download links with file details

## Third-party service and privacy

This extension uses the public service `store.rg-adguard.net` to generate direct download links for Microsoft Store apps. The extension sends the user-provided query to that service and displays links returned by it; it does not host or serve the files itself. Be aware that queries and results are exchanged with that third-party service. If you have concerns about privacy or availability, please review `store.rg-adguard.net`'s terms and policies.

## Development

```
npm install
npm run dev
```
