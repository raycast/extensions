# MVG Departures - Raycast Extension

A comprehensive Raycast extension for real-time Munich public transport (MVG) departure information. Get instant access to U-Bahn, S-Bahn, Tram, and Bus departures with a clean, organized interface.

![MVG Extension Demo](https://via.placeholder.com/800x400/2c2c2c/ffffff?text=MVG+Departures+Extension)

## ✨ Features

- **Real-time Departures**: Live departure times with delay information and cancellation alerts
- **Multi-Transport Support**: U-Bahn, S-Bahn, Tram, and Bus departures in one view
- **Organized Display**: Departures grouped by transport type for easy navigation
- **Smart Station Search**: Searchable dropdown with all Munich public transport stations
- **Quick Access Stations**: Set and access your home and work stations instantly
- **Auto-refresh**: Automatic updates every 30 seconds to keep information current
- **Delay Indicators**: Visual indicators for delays and cancellations
- **Platform Information**: Platform numbers and absolute departure times
- **Occupancy Information**: Real-time occupancy levels for vehicles

## 🚀 Installation

1. Open Raycast
2. Go to Extensions
3. Search for "MVG Departures" or install from the [Raycast Store](https://raycast.com/extensions)
4. Install the extension

## 📖 Usage

### Basic Usage

1. Open Raycast (`⌘ + Space`)
2. Type "mvg" or "MVG Departures"
3. Press Enter to launch the extension
4. View real-time departure information for the default station (Marienplatz)

### Station Selection

**Via Dropdown:**
1. Click on the station dropdown in the top-right corner
2. Search for your desired station by typing
3. Select from the search results

**Set Home/Work Stations:**
1. Select any departure item or use the empty view
2. Press `⌘K` or `Tab` to open the Action Panel
3. Choose "Set Home Station" or "Set Work Station"
4. Search for and select your preferred station
5. Access your saved stations quickly via the "Quick Access" section

### Interface Elements

- **Transport Type Sections**: Departures are grouped by U-Bahn, S-Bahn, Tram, and Bus
- **Departure Information**: Shows line number, destination, platform, and departure time
- **Status Indicators**: 
  - 🔵 Normal departures (blue)
  - 🟠 Delayed departures (orange)
  - 🔴 Cancelled departures (red)
- **Time Display**: Relative time (e.g., "5 min") and absolute time (e.g., "14:35")
- **Occupancy**: Real-time passenger occupancy information

## ⚙️ Configuration

The extension uses local storage to save your preferences:

- **Home Station**: Your primary station for quick access
- **Work Station**: Your work location station for easy commuting
- **Last Selected Station**: Automatically remembers your last viewed station

No additional configuration is required - the extension works out of the box!

## 🔧 Actions

Access these actions via the Action Panel (`⌘K` or `Tab`):

| Action | Description | Usage |
|--------|-------------|-------|
| Set Home Station | Configure your home station | Opens searchable station list |
| Set Work Station | Configure your work station | Opens searchable station list |
| Refresh Departures | Manually refresh departure data | Immediately updates departure times |

## 🌐 API Information

This extension uses the official MVG API:

- **Departures**: `https://www.mvg.de/api/bgw-pt/v3/departures`
- **Station Search**: `https://www.mvg.de/api/bgw-pt/v3/locations`
- **Transport Types**: U-Bahn, S-Bahn, Tram, Bus
- **Update Frequency**: Every 30 seconds (automatic)
- **Data Source**: Real-time MVG systems

## 🏗️ Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Raycast app installed

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd mvg-extension

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Build

```bash
# Build the extension
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

### Project Structure

```
src/
├── mvg.tsx              # Main extension component
└── package.json         # Extension configuration

assets/
└── extension-icon.png   # Extension icon
```

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [MVG (Münchner Verkehrsgesellschaft)](https://www.mvg.de/) for providing the public API
- [Raycast](https://raycast.com/) for the excellent extension platform
- Munich public transport users for feedback and testing

---

**Note**: This extension is not officially affiliated with MVG or Münchner Verkehrsgesellschaft. It uses publicly available APIs to provide departure information.