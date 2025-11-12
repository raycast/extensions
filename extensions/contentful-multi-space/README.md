# Contentful Extension for Raycast

A Raycast extension that allows you to search Contentful entries across multiple spaces.

## Features

- **Multi-Space Search**: Search across multiple Contentful spaces simultaneously
- **Real-time Search**: Instant results as you type (minimum 2 characters)
- **Smart Title Extraction**: Automatically finds the best display title from common field names
- **Quick Actions**: Open entries in Contentful Web App, copy IDs and URLs
- **Rich Display**: See space name, content type, and last modified date at a glance

## Setup

### 1. Configure Contentful Spaces

1. Open the extension in Raycast
2. Press `⌘,` to open preferences
3. Add your Contentful space configurations as a JSON array:

```json
[
  {
    "name": "Marketing Site",
    "spaceId": "your-space-id-1",
    "accessToken": "your-access-token-1",
    "environment": "master"
  },
  {
    "name": "Blog",
    "spaceId": "your-space-id-2",
    "accessToken": "your-access-token-2",
    "environment": "master"
  }
]
```

### 2. Get Your Contentful Credentials

1. Log in to [Contentful](https://app.contentful.com)
2. Go to **Settings** → **API keys**
3. Create or select a Content Delivery API key
4. Copy your **Space ID** and **Content Delivery API access token**

## Usage

1. Open Raycast
2. Type "Search Contentful Entries" to launch the command
3. Start typing to search across all configured spaces
4. Results appear in real-time (minimum 2 characters)

### Actions

Once you find an entry, you can:

- **⌘O** - Open entry in Contentful Web App
- **⌘C** - Copy Entry ID to clipboard
- **⌘⇧C** - Copy Entry URL to clipboard
- **⌘⇧S** - Copy Space ID to clipboard
- **⌘⇧T** - Copy Content Type to clipboard

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Lint
npm run lint

# Fix lint issues
npm run lint:fix
```

## License

MIT
