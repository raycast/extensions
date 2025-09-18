# Mozilla VPN Connect

_Interact with the Mozilla VPN client from Raycast using natural language commands without even opening the Mozilla client._

## What does it do?

### Core VPN Functionality
- **Installation Check**: Verifies the Mozilla VPN application is installed and prompts you to download if missing
- **Authentication Check**: Confirms you're logged in and opens the app if authentication is needed
- **Smart Connection**: Connects using the Mozilla VPN client with automatic retry logic for reliable connections
- **Real-time Status**: Displays current server location, connection status, and external IP address
- **IP Geolocation**: Fetches and displays your current external IP with country and city information
- **Server Management**: Change servers by country/city with automatic random server selection when multiple options exist

### AI-Powered Natural Language Commands

The extension now includes AI capabilities that let you control your VPN using natural language! Simply type commands like:

#### 🔌 **Connection Control**
- `"Connect to VPN"` - Connect using your last configuration
- `"Connect to Germany"` - Connect to a random server in Germany  
- `"Connect to Seattle, USA"` - Connect to a specific city
- `"Disconnect VPN"` / `"Turn off VPN"` - Disconnect immediately
- `"Change server to London, UK"` - Switch server without connecting

#### 📊 **Status & Information**
- `"VPN status"` / `"Is VPN connected?"` - Show connection status and IP
- `"What's my IP address?"` - Display current IP and location

#### 📍 **Server Discovery**
- `"List countries"` - Show all available VPN countries
- `"Show cities in USA"` - List all cities available in a specific country
- `"Show servers in UK"` - Display all servers in a country (grouped by city)
- `"Servers in London, UK"` - Show servers available in a specific city

#### 🔄 **Smart Features**
- **Auto-reconnection**: If you were connected and change servers, it automatically reconnects
- **Retry Logic**: Automatically retries failed connections up to 3 times
- **Country Aliases**: Understands "USA", "US", "United States", "UK", "United Kingdom", etc.
- **Partial Matching**: Finds countries/cities even with partial names

## Requirements

- Must have a Mozilla VPN account
- Must have the Mozilla VPN client downloaded and configured
- Raycast with AI Extensions enabled (for natural language commands)

## Example AI Commands

```
"Connect to VPN"
"Disconnect from VPN" 
"What's my current IP?"
"List all countries"
"Show cities in Germany"
"Connect to Berlin, Germany"
"Show servers in London, UK"
"Change server to Tokyo, Japan"
"VPN status"
```

## CLI Commands Used for Mozilla Client

The extension uses these Mozilla VPN CLI commands under the hood:

- **Connect**: `/Applications/Mozilla\ VPN.app/Contents/MacOS/Mozilla\ VPN activate`
- **Disconnect**: `/Applications/Mozilla\ VPN.app/Contents/MacOS/Mozilla\ VPN deactivate`  
- **Status**: `/Applications/Mozilla\ VPN.app/Contents/MacOS/Mozilla\ VPN status`
- **List Servers**: `/Applications/Mozilla\ VPN.app/Contents/MacOS/Mozilla\ VPN servers`
- **Select Server**: `/Applications/Mozilla\ VPN.app/Contents/MacOS/Mozilla\ VPN select [server-name]`

The status command shows connection state, server location, and all configured devices for your account.

## APIs Used for IP Data

- **IP Address**: `https://api.ipify.org` - For retrieving your current external IP
- **Geolocation**: `http://ip-api.com` - For determining the geographic location of your IP address

## Technical Features

- **Robust Error Handling**: Graceful handling of connection failures with helpful error messages
- **Type Safety**: Full TypeScript implementation with comprehensive type checking
- **Smart Server Selection**: Intelligent random server selection when multiple servers are available
- **Connection Validation**: Verifies you're connected to the requested location
- **Fallback Support**: Multiple retry mechanisms for reliable VPN operations