# Wolt Raycast Extension

A powerful Raycast extension for interacting with the Wolt delivery service. Browse venues, explore menu items, and search for restaurants and food items directly from Raycast.

## Features

- **Search Venues**: Search for restaurants and venues available on Wolt
- **Search Menu Items**: Find specific menu items across all Wolt venues
- **View Menus**: Browse complete menus organized by category
- **City Management**: Set your default city for location-based searches
- **Quick Actions**: Open venues and items in your browser, copy information to clipboard

## Installation

1. Open Raycast
2. Go to Extensions → Browse Extensions
3. Search for "Wolt"
4. Click "Install"

Alternatively, you can install it manually:

1. Clone this repository
2. Open Raycast → Extensions → Import Extension
3. Select the cloned directory

## Setup

Before using the extension, you need to set your city:

1. Open Raycast
2. Run the **"Set City"** command (or use `⌘,` to open Extension Preferences)
3. Select your city from the list
4. Your city preference will be saved for all future searches

## Commands

### Set City

Select your default city for Wolt searches. This can be done via:
- The "Set City" command
- Extension Preferences (`⌘,`)

**Usage**: Run the command and search for your city, then select it to set as default.

### Search Venues

Search for restaurants and venues available on Wolt in your selected city.

**Usage**: 
- Run the command
- Type a venue name or cuisine type
- Browse results in a grid view
- Select a venue to view its menu or open in browser

**Features**:
- Grid view with venue images
- Online/offline status indicators
- Quick access to venue menus
- Copy venue name or URL

### Search Items

Search for specific menu items across all Wolt venues in your city.

**Usage**:
- Run the command
- Type an item name (e.g., "pizza", "sushi", "burger")
- Browse results showing items from different venues
- Select an item to view the full menu with the item highlighted

**Features**:
- Cross-venue item search
- Price and availability information
- Direct link to the item in context
- Wolt+ indicator for premium items

## Keyboard Shortcuts

### In Search Results

- `⌘.` - Copy venue/item name
- `⌘⇧.` - Copy venue URL
- `Enter` - View menu (for venues) or open in browser

### In City Selection

- `⌘C` - Copy city slug

## Project Structure

```
wolt/
├── src/
│   ├── components/
│   │   └── menu-view.tsx      # Menu display component
│   ├── utils/
│   │   ├── location.ts        # City and location management
│   │   └── menu.ts            # Menu utilities and URL builders
│   ├── search-venues.tsx       # Venue search command
│   ├── search-items.tsx        # Item search command
│   └── set-city.tsx            # City selection command
├── scripts/
│   └── update-cities.js        # Script to update city list
├── assets/
│   └── extension-icon.png     # Extension icon
└── package.json                # Dependencies and scripts
```

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Raycast API access

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd wolt
```

2. Install dependencies:
```bash
npm install
```

3. Update cities list (optional):
```bash
npm run update-cities
```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the extension
- `npm run lint` - Run ESLint
- `npm run fix-lint` - Fix linting issues
- `npm run update-cities` - Update the cities list from Wolt API

### Building

The extension is automatically built before publishing. To build manually:

```bash
npm run build
```

This will:
1. Run `update-cities` script to fetch the latest cities
2. Build the extension using Raycast CLI

## Technical Details

### Dependencies

- `@raycast/api` - Raycast API for UI components
- `@raycast/utils` - Raycast utilities (useCachedPromise, etc.)
- `wolt-api` - Wolt API client library

### Data Flow

1. **City Selection**: User selects a city → Stored in LocalStorage and preferences
2. **Location Resolution**: City slug → Fetched from Wolt API → Cached with coordinates
3. **Search**: Query + Location → Wolt API → Results displayed in grid/list
4. **Menu View**: Venue ID → Wolt API → Menu grouped by categories


## Author

Created by [oztamir](https://github.com/oztamir)