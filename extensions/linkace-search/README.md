# LinkAce Search

Search, filter, inspect, and open links from your LinkAce instance directly in Raycast.

## Features

- Search links by URL, title, and description
- Filter by visibility, broken links, lists, tags, and sorting
- Show tag names directly in the results list, with full list and tag memberships in the detail view
- Open a detailed view for each result
- Copy the URL, title, or Markdown link with shortcuts
- Open entries directly in LinkAce
- Run a dedicated connection test for URL, API key, and proxy setup
- Support proxy environments via extension preferences, environment variables, and macOS system network settings

## Configuration

Before using the extension, create a personal API key in your LinkAce instance.

1. Open your LinkAce instance in the browser.
2. Go to the LinkAce settings and create an API key for your account.
3. Copy the generated key and paste it into the Raycast extension preferences.

See the official LinkAce API documentation for details:
- https://api-docs.linkace.org/

Then configure these extension preferences in Raycast:

- `LinkAce URL`: Base URL of your LinkAce installation, e.g. `https://linkace.example.com`
- `API Key`: Personal LinkAce API key created in LinkAce
- `Proxy URL` (optional): HTTP/HTTPS proxy URL for network requests. If omitted, the extension automatically falls back to environment variables and macOS system proxy settings when available.

## Usage

### Search LinkAce

- Run the **Search LinkAce** command
- Optionally pass a search term as a command argument
- Open the filter action to restrict results by lists, tags, visibility, or sorting
- Select a result and press `Enter` to open the URL in the browser
- Use the actions to show details, copy values, or open the entry in LinkAce

#### Useful Shortcuts

- `Enter`: Open the selected link
- `⌘Y`: Show details
- `⌘C`: Copy URL
- `⌘⇧C`: Copy title
- `⌘⌥C`: Copy Markdown link
- `⌘⇧F`: Configure filters
- `⌘R`: Refresh results
- `⌘⇧R`: Reset filters

### Test LinkAce Connection

- Run the **Test LinkAce Connection** command
- The extension validates connectivity, authentication, and proxy resolution, including automatic fallback to environment variables or macOS system settings
