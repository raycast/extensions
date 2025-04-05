# LightProxy for Raycast

A Raycast extension for controlling [LightProxy](https://github.com/xenith-core/lightproxy), a local development proxy with automatic HTTPS and service discovery.

## Features

- Start and stop LightProxy server
- Run auto-setup with custom TLD
- View server status and configuration
- List all domain mappings with clickable links
- Add and remove domain mappings
- Discover and add running services

## Prerequisites

- [LightProxy](https://github.com/xenith-core/lightproxy) installed and in your PATH
- [Raycast](https://www.raycast.com/) installed on your Mac

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/raycast-lightproxy.git
cd raycast-lightproxy
```

2. Install dependencies:
```bash
npm install
```

3. Development mode:
```bash
npm run dev
```

4. Build the extension:
```bash
npm run build
```

## Commands

### Start LightProxy
Starts the LightProxy server with default settings.

### Setup LightProxy
Runs the auto-setup command with options to customize the TLD and run in foreground mode.

### LightProxy Status
Shows the current status of the LightProxy server, including HTTP/HTTPS addresses, TLD, and mapping count.

### List Mappings
Lists all domain mappings with options to open them in the browser or copy URLs to clipboard.

### Add Mapping
Add a new domain mapping to LightProxy.

### Remove Mapping
Remove an existing domain mapping.

### Discover Services
Discovers running Docker containers and local services and adds them to LightProxy.

### Stop LightProxy
Stops the LightProxy server. 