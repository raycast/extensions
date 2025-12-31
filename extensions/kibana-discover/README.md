# Kibana Discover Extension for Raycast

A powerful Raycast extension for searching and opening Kibana data views with multi-instance support, customizable fields, and advanced filtering capabilities.

## Features

### Core Features
- 🔍 **Live Search** - Filter data views in real-time as you type
- 🏢 **Multi-Instance Support** - Manage multiple Kibana instances with dropdown selector
- ⚡ **Instant Open** - Press Enter to open data view in Kibana Discover
- 🎨 **Dynamic Icons** - Crown icon for production, Gear icon for others
- 📋 **Multiple Actions** - Copy ID, name, or URL with keyboard shortcuts
- 🔄 **Built-in Refresh** - Fetch latest data views directly from Kibana
- 🚀 **Fast** - No Terminal windows, everything in Raycast!

### Advanced Features
- ⏱️ **Time Range Selection** - Choose from 7 preset time ranges (15m, 1h, 24h, 7d, etc.)
- 📊 **Column Configuration** - Select which fields to display in Kibana Discover
- 🔎 **Search Query Input** - Set Kuery queries for filtered views (session only)
- 🎯 **Custom Fields Per Instance** - Configure available fields for each Kibana instance
- 💾 **Smart Persistence** - Remembers field and time range selections per data view
- 📱 **Detail View** - Toggle between compact and detailed list views

## Installation

### Prerequisites

1. **Raycast** installed on macOS
2. **Node.js** and npm (v16 or higher recommended)

### Setup Extension

**Development Mode (Recommended for testing)**

```bash
cd /path/to/kibana-discover
npm install
npm run dev
```

This opens the extension in Raycast development mode with hot-reload.

**Build for Production**

```bash
npm install
npm run build
```

Then import the built extension in Raycast Settings → Extensions → Add Extension.

## Configuration

### Multi-Instance Setup

The extension supports multiple Kibana instances. Configure them using a JSON array in preferences.

1. **Open Raycast Settings**
   - Press `⌘,` in Raycast or type "Preferences"

2. **Navigate to Extensions → Kibana Discover**

3. **Configure Kibana Instances (JSON)**
   - Paste a JSON array with your Kibana instances

**Configuration Format:**

```json
[
  {
    "name": "Production - Environment",
    "url": "https://production-kibana.example.com",
    "username": "elastic",
    "password": "elastic",
    "commonFields": ["TraceId", "message", "MachineName", "level", "logger"]
  },
  {
    "name": "Staging Environment",
    "url": "https://staging-kibana.example.com",
    "username": "elastic",
    "password": "your-password",
    "commonFields": ["message", "level", "source", "host.name"]
  },
  {
    "name": "Development",
    "url": "https://dev-kibana.example.com",
    "apiKey": "your-api-key-here"
  }
]
```

**Configuration Options:**

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Instance display name (shown in dropdown) |
| `url` | ✅ | Kibana instance URL |
| `username` | ⚠️ | Username for Basic Auth (or use apiKey) |
| `password` | ⚠️ | Password for Basic Auth (or use apiKey) |
| `apiKey` | ⚠️ | Kibana API Key (alternative to username/password) |
| `commonFields` | ❌ | Array of field names to show in column selector |

**Authentication Methods:**
- **Basic Auth**: Provide both `username` and `password`
- **API Key**: Provide `apiKey` (preferred for production)

**Custom Fields:**
- If `commonFields` is not specified, defaults to: `["TraceId", "message", "MachineName", "level", "logger", "thread", "host.name", "service.name", "error.message", "http.request.method", "http.response.status_code", "user.name", "source", "tags"]`
- Customize per instance to show only relevant fields for that environment

### Example Configuration File

See `MULTI-INSTANCE-EXAMPLE.json` in the project root for a complete example.

## Usage

### 1. Refresh data-views

Before searching, fetch data views from your Kibana instance(s):

```
⌘Space → "Refresh data-views"
```

**For single instance:**
- Automatically fetches and caches data views

**For multiple instances:**
- Shows a list of configured instances
- Select the instance you want to refresh
- Press Enter to fetch data views

**This command:**
- Connects to your Kibana instance
- Fetches all data views (supports Kibana 7.x and 8.x)
- Saves them to local cache for fast access
- Merges with existing cache (preserves other instances)
- Shows success notification with data view count

**Run this command whenever:**
- You first set up the extension
- You add new data views in Kibana
- You want to refresh the list
- You switch environments or add new instances

### 2. Search data-views

```
⌘Space → "Search data-views" or "Kibana"
```

### Instance Selection

If you have multiple instances configured:
- Use the dropdown in the top-right to switch between instances
- The extension remembers your selections per data view across instances

### Live Filtering

Start typing to filter instantly:
- **"prod"** - Shows all production data views
- **"staging"** - Shows staging data views
- **"logs-2024"** - Shows logs from 2024
- Search by name or index pattern

### Actions

**Primary Actions:**

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Open in Discover** | `Enter` | Opens data view in Kibana with selected time range, columns, and query |
| **Set Search Query** | `⌘Q` | Opens form to enter Kuery query for filtering |
| **Toggle Detail View** | - | Show/hide detailed metadata panel |

**Set Time Range:**

Choose from preset time ranges:
- Last 15 minutes
- Last 30 minutes
- Last 1 hour
- Last 24 hours
- Last 7 days
- Today
- This week

Time range is saved per data view.

**Configure Columns:**

Select which fields to display in Kibana Discover:
- Toggle checkmarks next to fields
- Available fields are from instance's `commonFields` configuration
- Selection is saved per data view
- Default: `["TraceId", "message"]`

**Copy Actions:**

| Action | Shortcut | Description |
|--------|----------|-------------|
| Copy Data View ID | `⌘C` | Copies the data view UUID |
| Copy Data View Name | `⌘⇧C` | Copies the display name |
| Copy Discover URL | `⌘⌥C` | Copies the full Kibana URL with all parameters |

### Search Query (KQL)

Press `⌘Q` on any data view to set a Kuery query:

1. Opens a text form
2. Enter your Kibana Query Language (KQL) query
3. Examples:
   - `fedac3b17afd4b2b9a80e3aa3007b848 and nxtalsedi6688`
   - `level: "ERROR" and service.name: "api"`
   - `host.name: "server-01"`
4. Leave empty to clear the query
5. Query is active for current session only (not persisted between sessions)

The query will be included in the Discover URL when you open it.

### Detail View

The detail panel shows:
- **Instance**: Which Kibana instance this data view belongs to
- **Data View Name**: Display name
- **Index Pattern**: The actual index pattern
- **Time Range**: Currently selected time range
- **Search Query**: Active query or "(no filter)"
- **Selected Columns**: Count of selected fields
- **Fields**: Visual list of selected column fields

Toggle on/off using the "Toggle Detail View" action.

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Raycast Extension                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Search data-views (search-data-views.tsx)                 │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ - Load cache from disk                                │ │
│  │ - Display data views in list                          │ │
│  │ - Live filtering as you type                          │ │
│  │ - Instance dropdown selector                          │ │
│  │ - Configure time range, columns, query                │ │
│  │ - Build Kibana Discover URL                           │ │
│  │ - Open in browser                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Refresh data-views (refresh-data-views.tsx)               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ - Read preferences (instances config)                 │ │
│  │ - Fetch data views from Kibana API                    │ │
│  │ - Merge with existing cache                           │ │
│  │ - Save to disk                                        │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │   Local Cache (JSON)        │
              │   Multi-Instance Format:    │
              │   {                         │
              │     "Production": {         │
              │       instance: {...},      │
              │       dataViews: [...]      │
              │     },                      │
              │     "Staging": {            │
              │       instance: {...},      │
              │       dataViews: [...]      │
              │     }                       │
              │   }                         │
              └─────────────────────────────┘
```

### Workflow

1. **Configure** - Set Kibana instances in JSON format via preferences
2. **Refresh** - Fetch data views from one or more instances
3. **Search** - Browse, filter, and configure data views
4. **Open** - Launch Kibana Discover with your exact preferences
5. **Repeat** - Selections are persisted for next time

### Data Flow

```
User Action → Extension → Cache/Storage → Kibana Browser
     ↑                         ↓
     └─────── Preferences ─────┘
```

## Project Structure

```
kibana-discover/
├── package.json                    # Extension manifest & preferences
├── tsconfig.json                   # TypeScript configuration
├── README.md                       # This documentation
├── MULTI-INSTANCE-EXAMPLE.json     # Configuration example
├── assets/
│   └── command-icon.png           # Extension icon
├── src/
│   ├── search-data-views.tsx      # Main search UI
│   └── refresh-data-views.tsx     # Refresh command
└── node_modules/                   # Dependencies
```

### Tech Stack

- **TypeScript** - Type-safe development
- **React** - UI components
- **@raycast/api** - Raycast extension API
- **Node.js HTTPS/HTTP** - API communication
- **LocalStorage API** - User preferences persistence
- **File System** - Cache management

### Cache Structure

**Location:**
```
~/Library/Application Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

**Format:**
```json
{
  "Production - Environment": {
    "instance": {
      "name": "Production - Environment",
      "url": "https://production-kibana.example.com",
      "commonFields": ["TraceId", "message", "MachineName", "level", "logger"]
    },
    "dataViews": [
      {
        "number": 1,
        "name": "logs-production-2024",
        "title": "logs-production-*",
        "id": "3e1bdc71-ba6d-4abe-834b-60f80ad0d736"
      }
    ]
  },
  "Staging Environment": {
    "instance": { ... },
    "dataViews": [ ... ]
  }
}
```

## Development

### Run Local Dev Server

```bash
# Start development server with hot-reload
npm run dev
```

The extension will automatically reload when you save changes to TypeScript files.

**Development Tips:**
- Changes to `src/*.tsx` files trigger automatic rebuild
- Check the terminal for TypeScript errors (some React type warnings are normal)
- Use `console.log()` for debugging (appears in Raycast Developer Console)
- Press `⌘R` in Raycast to reload the extension manually

### Build Production Version

```bash
npm run build
```

Output will be in the `dist/` folder.

### Code Quality

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run fix-lint
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Build production version to `dist/` |
| `npm run lint` | Run ESLint checks |
| `npm run fix-lint` | Auto-fix ESLint issues |
| `npm run publish` | Publish to Raycast Store |

## Cache Management

### Cache Location

```
~/Library/Application Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

### View Cache

```bash
cat ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

### Force Clean Cache

**Method 1: Delete Cache File**

```bash
rm ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

Then run "Refresh data-views" to rebuild.

**Method 2: Delete Specific Instance**

Open the cache file and remove the instance:

```bash
# Edit cache manually
nano ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json

# Or use a JSON editor
code ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

Remove the instance key and save.

**Method 3: Full Reset**

```bash
# Delete cache
rm ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json

# Clear LocalStorage (selections)
# Note: This is stored by Raycast internally - refresh all instances to rebuild
```

### Clear User Selections

User selections (field selections, time ranges, queries) are stored in Raycast's LocalStorage API. To reset:

1. Delete the cache file (see above)
2. Restart Raycast
3. Refresh all your instances

### Backup Cache

```bash
# Backup before major changes
cp ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json \
   ~/Desktop/kibana-discover-cache-backup.json

# Restore from backup
cp ~/Desktop/kibana-discover-cache-backup.json \
   ~/Library/Application\ Support/com.raycast.macos/Extensions/kibana-discover/cache.json
```

## Troubleshooting

### "No data views cached" Error

**Cause:** Cache file doesn't exist or is empty.

**Solution:** Run the refresh command:
```
⌘Space → "Refresh data-views"
```

### "No Kibana instances configured"

**Cause:** The `instancesJson` preference is empty or invalid.

**Solution:**
1. Open Raycast Settings (`⌘,`)
2. Go to Extensions → Kibana Discover
3. Paste a valid JSON array of instances (see Configuration section)

### Invalid JSON Configuration

**Cause:** Syntax error in your instances JSON.

**Solution:**
1. Validate your JSON using [JSONLint](https://jsonlint.com/)
2. Common issues:
   - Missing commas between objects
   - Missing quotes around strings
   - Trailing commas in arrays
3. Use the `MULTI-INSTANCE-EXAMPLE.json` as a template

### Authentication Failed

**Possible Causes:**
- Incorrect username/password
- Invalid API key
- Kibana instance unreachable
- Network/firewall issues

**Solutions:**
1. Verify credentials by logging into Kibana web UI
2. Check Kibana URL is accessible (try in browser)
3. For API Key: Create a new one in Kibana → Stack Management → API Keys
4. Check for typos in configuration JSON
5. Ensure no trailing slashes in URL

### Extension Doesn't Appear in Raycast

**Solutions:**
1. Make sure you're running `npm run dev`
2. Check terminal for build errors
3. Go to Raycast → Extensions to verify it's loaded
4. Try restarting Raycast (`⌘Q` then reopen)
5. Check `package.json` has valid commands

### TypeScript Warnings

Some TypeScript errors related to React types are normal and don't affect functionality:
```
Type '{ children: Element; }' has no properties in common with type 'IntrinsicAttributes'
```

These are React version compatibility warnings and can be safely ignored.

### Dev Server Crashes (Exit Code 137)

**Cause:** Out of memory or process killed.

**Solution:**
```bash
# Stop any existing dev servers
pkill -f "ray develop"

# Restart
npm run dev
```

### Time Range Not Updating

**Cause:** Time range is stored per data view.

**Solution:** Select the time range again from the actions menu. It should save automatically.

### Query Not Applied

**Cause:** Query might not be saved.

**Solution:**
1. Press `⌘Q` to open query form
2. Enter or update query
3. Submit the form
4. Look for success toast notification
5. Try opening in Discover again

### Instance Dropdown Not Showing

**Cause:** You only have one instance configured.

**Expected Behavior:** Dropdown only appears when you have 2+ instances in your configuration.

## Customization

### Customize Default Fields

Edit `DEFAULT_FIELDS` in `src/search-data-views.tsx`:

```typescript
const DEFAULT_FIELDS = ["TraceId", "message"];  // Change these
```

### Customize Time Ranges

Edit `TIME_RANGES` in `src/search-data-views.tsx`:

```typescript
const TIME_RANGES: TimeRange[] = [
  { label: "Last 5 minutes", from: "now-5m", to: "now" },  // Add custom ranges
  { label: "Last 15 minutes", from: "now-15m", to: "now" },
  // ...
];
```

### Customize Default Time Range

Edit `DEFAULT_TIME_RANGE` in `src/search-data-views.tsx`:

```typescript
const DEFAULT_TIME_RANGE = "Last 15 minutes";  // Change default
```

### Add Custom Common Fields

Edit `COMMON_FIELDS` in `src/search-data-views.tsx`:

```typescript
const COMMON_FIELDS = [
  "TraceId",
  "message",
  "your-custom-field",  // Add your fields
  // ...
];
```

Or configure per instance in your JSON configuration.

### Change Icon Logic

Edit `getDataViewIcon()` in `src/search-data-views.tsx`:

```typescript
function getDataViewIcon(dataViewName: string): Icon {
  const lowerName = dataViewName.toLowerCase();
  if (lowerName.includes("production") || lowerName.includes("prod")) {
    return Icon.Crown;
  }
  if (lowerName.includes("staging")) {
    return Icon.Star;  // Add custom logic
  }
  return Icon.Gear;
}
```

## Security Notes

- **Credentials Storage**: Stored in Raycast's secure preferences system (not in plain text)
- **HTTPS**: Uses Node.js HTTPS with `rejectUnauthorized: false` for self-signed certificates
- **Authentication**: Supports both Basic Auth and API Key
- **API Keys**: Recommended for production environments (more secure than username/password)
- **No External Transmission**: Credentials only sent to your configured Kibana instances
- **Local Cache**: Cache file contains only data view metadata (no sensitive data)

## Publishing to Raycast Store

To share this extension publicly:

```bash
npm run publish
```

**Before publishing:**
1. Replace `command-icon.png` with a high-quality icon (512x512 recommended)
2. Update `author` field in `package.json` with your GitHub username
3. Test thoroughly with multiple Kibana instances
4. Remove any hardcoded credentials from examples
5. Write clear, helpful descriptions
6. Follow [Raycast Extension Guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)

## Migration from Script Commands

If you're migrating from the older script-based approach:

| Old | New |
|-----|-----|
| `.kibana-config.env` file | JSON in Raycast preferences |
| `list-kibana-dataviews.sh` | "Refresh data-views" command |
| `open-kibana-discover.sh` | "Search data-views" command |
| `~/.data-views-cache.json` | `~/Library/Application Support/.../cache.json` |
| Manual fzf selection | Native Raycast UI |
| Single instance | Multi-instance support |

## FAQ

**Q: Can I use multiple authentication methods for different instances?**
A: Yes! Each instance can use either Basic Auth (username/password) or API Key independently.

**Q: How do I switch between instances?**
A: Use the dropdown in the top-right corner of the search view.

**Q: Will my selections persist across Raycast restarts?**
A: Yes, field selections and time ranges are saved to LocalStorage. Search queries are temporary and reset each session.

**Q: Can I share my configuration with teammates?**
A: Yes, export your instances JSON and share it (remove sensitive credentials first!).

**Q: Does this work with Kibana Cloud?**
A: Yes, works with both self-hosted and Kibana Cloud instances.

**Q: How many instances can I configure?**
A: No hard limit, but the UI is optimized for 2-10 instances.

**Q: Can I use different fields for different instances?**
A: Yes, use the `commonFields` property in each instance configuration.

## License

MIT

## Credits

Built with ❤️ using [Raycast API](https://developers.raycast.com/)

## Support

For issues, questions, or contributions:
- Check this README first
- Review the troubleshooting section
- Check existing GitHub issues
- Open a new issue with detailed information

---

**Happy searching!** 🚀
