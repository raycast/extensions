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

Install this extension from the [Raycast Store](https://www.raycast.com/store).

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

### Default Instance

You can optionally set a default instance to select automatically:

1. In Raycast Settings → Extensions → Kibana Discover
2. Set "Default Instance" to the name of your preferred instance
3. If not set, the first instance in your list will be used