# Hero-SMS.com Raycast Extension

A Raycast extension for managing SMS activations through the Hero-SMS.com API. Get phone numbers, receive SMS codes, and manage your activations from Raycast.

## Features

### Core Functionality

- **Get Phone Number**: Request phone numbers for SMS activation from any service and country
- **See Activations**: View all active activations with real-time countdown timers
- **Favorite Services**: Quick one-click activation for your frequently used service+country combinations
- **Auto-copy**: Phone numbers are automatically copied to clipboard after activation

### Favorite Services

- Mark services as favorites for quick access
- Create favorite service+country combinations for instant activation
- One-click activation from favorites list
- Persistent storage across sessions

### Recently Used

- Automatically tracks your recently used countries per service
- Recently used countries appear at the top of the selection list
- Up to 10 recently used countries per service

### Balance Display

- Real-time account balance display in the action bar
- Auto-refreshes every 30 seconds
- Click to manually refresh balance

### Smart Features

- Full service and country names (no Russian names)
- Real-time activation timers with expiration tracking
- Automatic phone number formatting
- SMS code detection and extraction
- Local storage for timer accuracy

## Installation

### Prerequisites

- [Raycast](https://raycast.com/) installed on your Mac or Windows PC
- A Hero-SMS.com account with an API key

### Setup

1. **Clone or download this repository**

   ```bash
   git clone https://github.com/itemsCenter/herosms-integration.git
   cd hero-sms-com-integration
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the extension**

   ```bash
   npm run build
   ```

4. **Open in Raycast**
   - Open Raycast
   - Go to Extensions → Import Extension
   - Select this project folder

5. **Configure API Key**
   - Open Raycast Preferences
   - Go to Extensions → Hero-SMS.com Integration
   - Enter your Hero-SMS.com API key
   - The API key is stored securely and never shared

## Usage

### Get Phone Number

Request a new phone number for SMS activation.

1. Open Raycast and search for "Get phone number"
2. **Select a Service**:
   - Browse or search for the service you need
   - Favorite services appear at the top
   - Press `⌘F` to add/remove from favorites
   - Press `Enter` to select a service

3. **Select a Country**:
   - Recently used countries appear at the top
   - All countries listed below
   - Shows price and available phone count for each country
   - Press `Enter` to request a number

4. **Activation**:
   - Phone number is automatically copied to clipboard
   - Success toast notification appears
   - Activation is saved for tracking

**Keyboard Shortcuts:**

- `Enter` - Select service/country or request number
- `⌘F` - Add/remove service from favorites
- `⌘F` (in country selection) - Add service+country to favorite services

### Favorite Services

Quick access to your favorite service+country combinations.

1. Open Raycast and search for "Favorite Services"
2. View your saved favorites with:
   - Service name and country
   - Current price
   - Available phone count
3. Press `Enter` on any favorite to activate immediately
4. Press `⌘Delete` to remove from favorites

**Adding Favorites:**

- In "Get phone number", select a service and country
- Press `⌘F` to add the combination to favorites
- The combination is saved for future use

### See Activations

View and manage your active phone number activations.

1. Open Raycast and search for "See Activations"
2. View all active activations with:
   - Service name and phone number
   - Country name
   - Cost and time remaining
   - Status (Waiting for SMS, Code Received, etc.)

3. **Actions Available:**
   - `Enter` - Copy code and close (when code is available)
   - `⌘C` - Copy SMS code
   - `⌘⇧P` - Copy phone number
   - `⌘K` - Cancel activation (when no code yet)
   - `⌘R` - Refresh activations list

4. **View Details:**
   - Press `⌘I` or click on an activation to see full details
   - View SMS code, activation time, and all metadata

**Features:**

- Real-time countdown timer (20 minutes per activation)
- Automatic expiration detection
- SMS code extraction and cleaning
- Full service and country names

## Configuration

### API Key Setup

1. Get your API key from [Hero-SMS.com](https://hero-sms.com)
2. Open Raycast Preferences
3. Navigate to Extensions → Hero-SMS.com Integration
4. Enter your API key in the password field
5. The key is stored securely and encrypted

### Preferences

- **API Key** (Required): Your Hero-SMS.com API key for authentication

## Keyboard Shortcuts

### Get Phone Number

- `Enter` - Select service/country or request number
- `⌘F` - Toggle service favorite status
- `⌘F` (country selection) - Add service+country to favorites

### Favorite Services

- `Enter` - Activate selected favorite
- `⌘Delete` - Remove from favorites

### See Activations

- `Enter` - Copy code and close (when code available)
- `⌘C` - Copy SMS code
- `⌘⇧P` - Copy phone number
- `⌘K` - Cancel activation
- `⌘R` - Refresh list
- `⌘I` - View activation details

## Features in Detail

### Service Management

- **Full Service Names**: Displays complete service names instead of codes
- **Favorite Services**: Mark frequently used services for quick access
- **Service Search**: Search by service name or code

### Country Management

- **Full Country Names**: Shows English country names (no Russian)
- **Recently Used**: Tracks and displays recently used countries per service
- **Price Display**: Shows current price and availability for each country
- **Country Search**: Search by country name or ID

### Activation Management

- **Real-time Timers**: 20-minute countdown with second precision
- **Auto-expiration**: Automatically removes expired activations
- **SMS Code Detection**: Automatically extracts and cleans SMS codes
- **Status Tracking**: Shows activation status (Waiting, Code Received, etc.)
- **Local Storage**: Uses local timestamps for accurate timer tracking

### Balance Display

- **Real-time Balance**: Shows current account balance
- **Auto-refresh**: Updates every 30 seconds
- **Manual Refresh**: Click balance action to refresh
- **Action Bar Display**: Visible in bottom action bar during country selection

## Data Storage

The extension uses Raycast's LocalStorage for:

- Favorite services (service codes)
- Favorite service+country combinations
- Recently used countries per service
- Activation timestamps for accurate timer tracking

All data is stored locally and never sent to external servers (except Hero-SMS.com API calls).

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Linting

```bash
npm run lint
npm run fix-lint
```

### Project Structure

```
hero-sms-com-integration/
├── src/
│   ├── api.ts                 # API client and types
│   ├── get-phone-number.tsx  # Get phone number command
│   ├── favorite-services.tsx  # Favorite services command
│   ├── see-activations.tsx    # View activations command
│   └── utils.ts               # Utility functions
├── assets/
│   └── extension-icon.png     # Extension icon
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Requirements

- Raycast (macOS or Windows)
- Node.js 18+ (for development)
- Hero-SMS.com account with API key

## API Compatibility

This extension is compatible with the Hero-SMS.com API protocol. It uses the following endpoints:

- `getServicesList` - Fetch available services
- `getCountries` - Fetch available countries
- `getPrices` - Get pricing information
- `getNumberV2` - Request a phone number
- `getActiveActivations` - Get active activations
- `getStatusV2` - Get activation status
- `setStatus` - Update activation status
- `getBalance` - Get account balance

## Troubleshooting

### API Key Issues

- Ensure your API key is correct and active
- Check that the key has proper permissions
- Verify your account has sufficient balance

### Activation Not Appearing

- Activations expire after 20 minutes
- Refresh the list with `⌘R`
- Check your internet connection

### Balance Not Updating

- Balance auto-refreshes every 30 seconds
- Click the balance action to manually refresh
- Check your API key permissions

### Timer Issues

- Timers use local storage for accuracy
- If timers seem off, refresh the activations list
- Expired activations are automatically removed

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues related to:

- **Extension bugs**: Open an issue on GitHub
- **Hero-SMS.com API**: Contact Hero-SMS.com support
- **Raycast**: Check Raycast documentation

## Acknowledgments

- Built for [Raycast](https://raycast.com/)
- Uses [Hero-SMS.com](https://hero-sms.com) API
- Phone number formatting by [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js)

---

**Note**: This extension requires an active Hero-SMS.com account and API key. All API calls are made directly to Hero-SMS.com servers. No data is stored or transmitted to third parties.
