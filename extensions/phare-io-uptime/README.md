# Phare - Raycast Extension

A Raycast extension for managing and monitoring uptime for services using [Phare.io](https://phare.io).

## Features

- **View All Monitors**: See all your Phare.io monitors with their current status
- **Create New Monitors**: Set up new uptime monitors directly from Raycast
- **Real-time Status**: Monitor status updates with color-coded indicators
- **Search & Filter**: Easily find specific monitors in your list
- **Pause or Unpause Monitors**: Easily pause or unpause monitors in your list

## Prerequisites

Before using this extension, you need:

1. A [Phare.io](https://phare.io) account
2. A Phare.io API key. Phare Platform read only access is required. Uptime read and write access is required.

## Setup

### 1. Get Your Phare.io API Key

1. Log in to your [Phare.io dashboard](https://app.phare.io)
2. Navigate to **User Settings** → **API Keys**
3. Create a new API key
4. Keep this key secure - you'll need it for the extension

### 2. Install the Extension

1. Open Raycast
2. Go to **Extensions** → **Browse Extensions**
3. Search for "Phare" or install from the Raycast Store

### 3. Configure the Extension

1. You will be prompted to enter your API key the first time you use the extension
2. If you want to change your API key, you can do so in the extension preferences in Raycast

## Usage

### Show All Monitors

- **Command**: `Show All Monitors`
- **Description**: Displays all your Phare.io monitors with their current status
- **Features**:
  - Monitors are grouped by status (Online, Offline, Partial, Paused)
  - Color-coded status indicators
  - Search functionality to find specific monitors
  - Detailed view with monitor information
  - Pause or unpause monitors
  - Delete monitors

### Create Monitor

- **Command**: `Create Monitor`
- **Description**: Create a new uptime monitor for your services
- **Configuration Options**:
  - **Name**: Display name for the monitor
  - **URL**: The endpoint to monitor
  - **Method**: HTTP method (GET or HEAD)
  - **Interval**: Check frequency (30 seconds to 1 hour)
  - **Timeout**: Request timeout (1-30 seconds)
  - **Regions**: Monitoring locations worldwide
  - **Confirmations**: Number of failed checks before alerting
  - **Advanced Options**: Redirects, TLS verification, keywords, user agents

## Troubleshooting

### Common Issues

1. **"Invalid API Key" Error**
   - Verify your API key is correct
   - Ensure the key has proper permissions
   - Check if the key is active in your Phare.io dashboard

2. **"No monitors found"**
   - Confirm you have created monitors in Phare.io
   - Check your API key permissions
   - Verify the API endpoint is accessible

### Error Codes

| Code  | Description                             |
| ----- | --------------------------------------- |
| `401` | Unauthorized - Invalid API key          |
| `403` | Forbidden - Insufficient permissions    |
| `429` | Rate limited - Too many requests        |
| `500` | Server error - Contact Phare.io support |

## Support

- **Phare.io Documentation**: [https://docs.phare.io](https://docs.phare.io)
- **Phare.io Support**: [https://phare.io/contact](https://phare.io/contact)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.
