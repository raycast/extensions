# Postman API Client Extension for Raycast

Full-featured API client for Postman. Execute all HTTP methods (GET, POST, PUT, PATCH, DELETE), import cURL commands, manage environments, and track request history—all from Raycast without opening the Postman app.

## Features

- 🗂️ **Browse Collections** - View and navigate all your Postman collections
- 🚀 **Execute Requests** - Run GET, POST, PUT, PATCH, DELETE requests with full support for headers, query parameters, and request bodies
- ✏️ **Edit & Save** - Modify requests before execution and save changes back to Postman
- 📋 **cURL Import** - Import requests from cURL commands (auto-detects from clipboard)
- 🎯 **Create Requests** - Create new requests directly in your collections
- 🌍 **Environment Variables** - Manage environments and use variables in URLs and headers
- 📜 **Request History** - View and repeat your recently executed requests
- 📊 **Response Viewing** - Beautiful formatted responses with status codes, headers, and JSON pretty-printing
- ⚡ **Quick Execute** - One-keystroke execution for simple GET requests

## Installation

1. Install the extension from the [Raycast Store](https://raycast.com) or build from source
2. Configure your Postman API key:
   - Open Raycast Settings (`Cmd + ,`)
   - Navigate to Extensions → Postman
   - Enter your Postman API key in the "Access Token" field

### Get Your Postman API Key

1. Log in to [Postman](https://www.postman.com/)
2. Go to **Settings** → **API Keys**
3. Generate or copy your API key

## Usage

### Search Collections
1. Open Raycast (`Cmd + Space`)
2. Type "Search Collections" or "Postman"
3. Browse your collections and navigate through folders
4. Select a request to view details or execute

### Make Request
1. Open Raycast and search for "Make Request"
2. Optionally paste a cURL command (auto-detected from clipboard)
3. Enter method, URL, headers, and body
4. Execute the request

### View History
1. Open Raycast and search for "History"
2. Browse your recent requests
3. Repeat requests or view stored responses

### Keyboard Shortcuts

- `Cmd + Enter` - View request details / Quick execute
- `Cmd + Shift + Enter` - Quick execute (simple GET requests)
- `Cmd + S` - Save request changes
- `Cmd + H` - View request history
- `Cmd + I` - Import cURL command
- `Cmd + E` - Manage environments
- `Cmd + N` - Create new request (from collection view)

## Screenshots

Add screenshots to showcase your extension. Place them in the `media` folder at the root of your extension directory.

**Screenshot Requirements:**
- Size: 2000 x 1250 pixels (16:10 aspect ratio)
- Format: PNG
- Maximum: 6 screenshots (recommended: at least 3)
- Place files in: `media/` folder

**Recommended Screenshots:**
1. `media/1-collection-browsing.png` - Collection browsing view
2. `media/2-request-execution.png` - Request execution/editing view
3. `media/3-response-details.png` - Response details view
4. `media/4-environment-manager.png` - Environment manager
5. `media/5-history-view.png` - History view
6. `media/6-curl-import.png` - cURL import view

To add screenshots to your README, use:
```markdown
![Collection Browsing](media/1-collection-browsing.png)
![Request Execution](media/2-request-execution.png)
![Response Details](media/3-response-details.png)
```

## Development

### Prerequisites

- Node.js 16+
- Raycast app (macOS)
- Postman account with API key

### Setup

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Run in development mode
npm run dev
```

### Available Scripts

- `npm run build` - Build extension for production
- `npm run dev` - Start development mode with hot reload
- `npm test` - Run unit tests
- `npm run lint` - Lint code
- `npm run fix-lint` - Fix linting issues automatically

## License

MIT
