# RG AdGuard Links

> A Raycast extension to convert Microsoft Store URLs to direct download links via rg-adguard.net

[![Raycast](https://img.shields.io/badge/Raycast-Extension-red?style=flat-square&logo=raycast)](https://www.raycast.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

## Overview

RG AdGuard Links is a Raycast extension that converts Microsoft Store application URLs into direct download links via rg-adguard.net. This allows you to download Microsoft Store apps without using the Microsoft Store itself.

## Features

- **API Integration** - Makes proper POST requests to rg-adguard.net API
- **Direct Downloads** - Get actual download links for .appx, .msix, and other app packages
- **Multiple Files** - View and download all available files for an app (x64, x86, ARM versions, etc.)
- **Quick Actions** - Open download links directly or copy URLs to clipboard
- **Product ID Support** - Works with full URLs or just the product ID
- **Simple Interface** - Clean form input with results list view

## Installation

### Development Installation

1. Clone or download this repository
2. Navigate to the extension directory:
   ```bash
   cd extensions/rg-adguard-links
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start development server:
   ```bash
   npm run dev
   ```
5. In Raycast, go to: **Development** → **Import Extension**
6. Select the `rg-adguard-links` folder

### From Raycast Store

Coming soon - Extension will be submitted to Raycast Store

## Usage

1. Open Raycast (⌘ + Space or your configured hotkey)
2. Type "Convert Store URL" or search for the extension
3. Paste a Microsoft Store URL or product ID
4. Press Enter to fetch download links
5. Browse the list of available downloads
6. Press Enter on any file to download it, or:
   - Copy URL to clipboard
   - View file details

## Example

**Input (Microsoft Store URL):**
```
https://apps.microsoft.com/detail/9n0kwg910ldh
```

**Or just the Product ID:**
```
9n0kwg910ldh
```

**Output:**
The extension will display a list of all available downloads for that app, including:
- Different architectures (x64, x86, ARM64)
- Dependencies
- Framework packages
- Various file formats (.appx, .msix, .appxbundle, etc.)

## Supported URL Formats

The extension handles various Microsoft Store URL formats:
- `https://www.microsoft.com/store/productId/9NBLGGH4NNS1`
- `https://apps.microsoft.com/detail/9NBLGGH4NNS1`
- `https://apps.microsoft.com/store/detail/9NBLGGH4NNS1`
- Product ID only: `9NBLGGH4NNS1`

## About rg-adguard.net

[rg-adguard.net](https://store.rg-adguard.net/) is a third-party service that provides direct download links for Microsoft Store applications. This is useful for:

- Downloading apps without Microsoft Store
- Offline installation
- Archiving specific app versions
- Installing apps on systems without Store access
- Troubleshooting store issues
- Downloading older versions of apps

## How It Works

1. **Extract Product ID** - Parses the Microsoft Store URL to extract the product ID
2. **API Request** - Makes a POST request to rg-adguard.net with the product ID
3. **Parse Response** - Extracts download links from the HTML response
4. **Display Results** - Shows all available files in a clean list view
5. **Download** - Opens selected files directly or copies URLs

## Project Structure

```
rg-adguard-links/
├── assets/               # Extension icons and images
│   └── icon.png         # Original 512x512 icon
├── metadata/            # Screenshots for Raycast Store
├── src/                 # Source code
│   └── convert-url.tsx # Main command implementation
├── icon.png            # Extension icon (512x512)
├── package.json        # Dependencies and configuration
├── tsconfig.json       # TypeScript configuration
└── README.md          # This file
```

## Development

### Prerequisites

- Node.js 16 or higher
- npm or pnpm
- Raycast app installed

### Scripts

```bash
# Start development server (recommended)
npm run dev

# Build extension
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

### Making Changes

1. Edit files in the `src/` directory
2. The dev server will automatically rebuild
3. Reload the extension in Raycast to see changes

## Contributing

Contributions are welcome! Here's how you can help:

### Ideas for Contribution

- Support for batch URL conversion
- History of converted URLs
- Favorites/bookmarks for frequently used apps
- Better error handling and user feedback
- Additional metadata display (app name, version, etc.)
- Filtering options for file types
- Download size information
- Integration with download managers

### Development Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Roadmap

- [x] Initial project scaffold
- [x] Implement proper API integration with rg-adguard.net
- [x] Parse and display download links
- [x] Add clipboard and browser actions
- [x] Support multiple URL formats
- [x] Product ID extraction
- [x] List view for results
- [ ] Add file size information
- [ ] Show app metadata (name, version, publisher)
- [ ] Add download history
- [ ] Create screenshots for Raycast Store
- [ ] Submit to Raycast Store

## Technical Details

### API Integration

The extension uses the rg-adguard.net API endpoint:
```
POST https://store.rg-adguard.net/api/GetFiles
```

With form data:
- `type`: "ProductId"
- `url`: The product ID
- `ring`: "Retail"
- `lang`: "en-US"

The response is HTML containing download links which are parsed using regex.

### Dependencies

- `@raycast/api` - Raycast extension API
- `@raycast/utils` - Utility functions for Raycast
- TypeScript for type safety
- React for UI components

## Troubleshooting

**Extension not loading:**
- Make sure the dev server is running (`npm run dev`)
- Try removing and re-importing the extension in Raycast
- Check that all dependencies are installed (`npm install`)

**No download links found:**
- Verify the product ID is correct
- Check your internet connection
- The app might not be available in your region
- Try again later (rg-adguard.net might be temporarily down)

**Invalid URL error:**
- Ensure the URL contains a valid product ID (format: 9XXXXXXXXXXXXX)
- Try using just the product ID instead of the full URL

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This extension is not affiliated with Microsoft Corporation or AdGuard. It simply provides a convenient way to access the rg-adguard.net service through Raycast. Use at your own discretion and ensure you comply with Microsoft's terms of service.

## Acknowledgments

- [rg-adguard.net](https://store.rg-adguard.net/) - For providing the Microsoft Store download service
- [Raycast](https://www.raycast.com/) - For the amazing launcher platform
- Microsoft Store - For application distribution

## Support

If you encounter any issues or have suggestions:
- Open an issue on GitHub
- Contribute to the project
- Share your feedback

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

Made with love for the Raycast community
