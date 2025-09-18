# IsThereAnyDeal Raycast Extension

[![Raycast Store](https://img.shields.io/badge/Raycast-Store-red)](https://www.raycast.com/gabeperez/isthereanydeal)
[![Version](https://img.shields.io/badge/version-1.0.1-blue)](https://github.com/gabeperez/isthereanydeal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Raycast extension for finding the best video game deals across multiple regions and stores. Search for games, compare prices, and track historical pricing data all from your Raycast launcher.

## Demo
https://github.com/user-attachments/assets/3a0ab9fd-839c-477c-8845-b7e192e88107

## Screenshots
<p align="center">

  <img src=".metadata/isthereanydeal-1.png" width="350" alt="IsThereAnyDeal Screenshot 1">

  <img src=".metadata/isthereanydeal-2.png" width="350" alt="IsThereAnyDeal Screenshot 2">

  <img src=".metadata/isthereanydeal-3.png" width="350" alt="IsThereAnyDeal Screenshot 3">

  <img src=".metadata/isthereanydeal-4.png" width="350" alt="IsThereAnyDeal Screenshot 4">

  <img src=".metadata/isthereanydeal-5.png" width="350" alt="IsThereAnyDeal Screenshot 5">

</p>

## Features

### 🎮 Game Search & Discovery

- **Instant Search**: Search for games by title with real-time results
- **Game Details**: View comprehensive game information including box art, tags, and developer info
- **Price Comparison**: See current lowest prices across all supported stores
- **Historical Data**: Track all-time low prices and price history

### 🌍 Multi-Region Support

- **20+ Countries**: Support for major regions including US, UK, Japan, Germany, and more
- **Localized Pricing**: Get prices in your local currency
- **Easy Region Switching**: Change your region with a simple dropdown (Command+K)
- **Persistent Settings**: Your region preference is saved automatically

### 🏪 Store & Platform Filtering

- **Store-Specific Views**: Filter deals by specific stores (Steam, GOG, Humble, etc.)
- **Platform Filtering**: View deals for specific platforms (PC, Switch, PlayStation, etc.)
- **Direct Store Links**: Click through to purchase directly from stores

### 💰 Price Intelligence

- **Current Best Deals**: Always see the lowest current price
- **Historical Lows**: Track the best price ever offered
- **Price Alerts**: See how much you can save compared to store regular prices
- **Bundle Information**: Discover games available in bundles

## Installation

### Prerequisites

- [Raycast](https://raycast.com/) installed on macOS
- IsThereAnyDeal API key (free at [isthereanydeal.com/app/](https://isthereanydeal.com/app/))

### Quick Install (Recommended)

1. **Install from Raycast Store**
   - Open Raycast and search for "Store"
   - Search for "Is There Any Deal" in the store
   - Click "Install" to add the extension

### Development Setup

1. **Install from Source**
   - Clone this repository
   - Run `npm install` to install dependencies
   - Copy `.env.example` to `.env` and update with your information:
     ```bash
     cp .env.example .env
     # Edit .env with your GitHub username and repository URL
     ```
   - Run `npm run dev` to start development mode

2. **Get Your API Key**
   - Visit [isthereanydeal.com/app/](https://isthereanydeal.com/app/)
   - Sign up for a free account
   - Generate your API key

3. **Configure the Extension**
   - On first launch, you'll see an inline API key input
   - Click "Enter API Key" to open preferences
   - Paste your API key in the preferences and save
   - Optionally set your preferred country/region

## Usage

### Basic Search

1. Open Raycast and type "Search IsThereAnyDeal"
2. Enter a game title to search
3. Browse results with current prices and store information
4. Press `Cmd+D` or click "Show Details" for comprehensive game information

### Changing Regions

1. In any view, press `Cmd+K` to open the Action Panel
2. Select "Set Country/Region"
3. Choose your desired country from the dropdown
4. Prices will automatically update for your selected region

### Detailed Game View

- **Current Lowest Price**: Click to go directly to the store
- **All-Time Low**: See the best historical price
- **Store Filtering**: Use "View Only [Store]" actions to filter by specific stores
- **Platform Filtering**: Use "View Only [Platform]" actions to filter by platform

### Keyboard Shortcuts

- `Cmd+D`: Show game details
- `Cmd+K`: Open Action Panel
- `Enter`: Open game on IsThereAnyDeal website
- `Cmd+Enter`: Open lowest price deal

## Development

### Project Structure

```
isthereanydeal/
├── src/
│   ├── search.tsx          # Main search interface
│   └── GameDetail.tsx      # Detailed game view
├── assets/
│   ├── extension-icon.png  # Extension icon
│   └── ITAD-logo.png      # IsThereAnyDeal logo
├── package.json           # Dependencies and metadata
├── raycast-env.d.ts       # TypeScript definitions
└── README.md             # This file
```

### Key Technologies

- **React**: UI framework
- **TypeScript**: Type safety with comprehensive type definitions
- **Raycast API**: Extension framework
- **IsThereAnyDeal API**: Game and price data
- **Modern ES6+**: Async/await, destructuring, and modern JavaScript features

### Environment Variables

The extension uses environment variables to protect author and repository information:

- `RAYCAST_AUTHOR`: Your GitHub username (used in package.json)
- `RAYCAST_REPOSITORY_URL`: Your repository URL (used in package.json)
- `RAYCAST_EXTENSION_NAME`: Extension name (optional, defaults to package.json)
- `RAYCAST_EXTENSION_TITLE`: Extension title (optional, defaults to package.json)

Copy `.env.example` to `.env` and update with your actual values. The `.env` file is gitignored to keep your information private.

### Development Commands

```bash
npm run dev          # Start development mode
npm run build        # Build for production
npm run lint         # Run ESLint
npm run fix-lint     # Fix linting issues
npm run publish      # Publish to Raycast Store
```

### API Integration

The extension integrates with multiple IsThereAnyDeal API endpoints:

- **Search**: `/games/search/v1` - Find games by title
- **Game Info**: `/games/info/v2` - Get detailed game information
- **Prices**: `/games/prices/v3` - Get current and historical prices
- **History**: `/games/history/v2` - Get price history data
- **Bundles**: `/games/bundles/v2` - Get bundle information

### State Management

The extension uses several state management patterns:

- **useLocalStorage**: For persistent user preferences (country selection)
- **useCachedPromise**: For efficient API calls with caching
- **useState**: For local component state
- **useEffect**: For side effects and data fetching
- **Centralized Constants**: Shared constants and utility functions
- **TypeScript Interfaces**: Comprehensive type definitions for API responses

## Configuration

### Preferences

- **API Key**: Your IsThereAnyDeal API key (required)
- **Country**: Default country for pricing (optional, defaults to US)

### Supported Countries

- United States (US)
- United Kingdom (GB)
- Canada (CA)
- Germany (DE)
- France (FR)
- Japan (JP)
- Australia (AU)
- Brazil (BR)
- Russia (RU)
- China (CN)
- South Korea (KR)
- India (IN)
- Italy (IT)
- Spain (ES)
- Sweden (SE)
- Poland (PL)
- Netherlands (NL)
- Turkey (TR)
- South Africa (ZA)

## Troubleshooting

### Common Issues

**"Missing API Key" Error**

- Ensure your API key is correctly entered in extension preferences
- Verify your API key is valid at [isthereanydeal.com/app/](https://isthereanydeal.com/app/)

**No Search Results**

- Check your internet connection
- Verify the game title spelling
- Some games may not be available in the IsThereAnyDeal database

**Prices Not Updating**

- Try changing your region and changing back
- Check if the game has any current deals
- Some games may not have price data for your selected region

**Extension Not Loading**

- Restart Raycast
- Check the Raycast logs for error messages
- Verify all dependencies are installed

### Debug Mode

The extension includes comprehensive logging. Check the Raycast logs for detailed information about API calls and data processing.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and patterns
- Add TypeScript types for new features
- Include error handling for all API calls
- Test with different regions and game types
- Update documentation for new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [IsThereAnyDeal](https://isthereanydeal.com/) for providing the API and game data
- [Raycast](https://raycast.com/) for the excellent extension framework
- The Raycast community for inspiration and support

## Support

If you encounter any issues or have questions:

1. Check the [troubleshooting section](#troubleshooting) above
2. Search existing [issues](../../issues) on GitHub
3. Create a new issue with detailed information about your problem

## Changelog

### [1.0.0] - {PR_MERGE_DATE}
### Version 1.0.0

- Initial release
- Game search functionality
- Multi-region support
- Detailed game views
- Store and platform filtering
- Setup screen for API key configuration
- Comprehensive error handling

---

**Happy deal hunting! 🎮💰**
