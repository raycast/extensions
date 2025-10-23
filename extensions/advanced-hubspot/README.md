# Raycast Advanced HubSpot Extension

A powerful Raycast extension for accessing HubSpot workflows and CRM data with advanced search capabilities.

**Team App**: This extension is published as a private team app for FINN_B2B_CS organization.

## Features

- 🔍 **Search Workflows**: Quickly search through all your HubSpot workflows by name or UUID
- 📧 **Search Marketing Emails**: Search and manage HubSpot marketing emails
- 📄 **Pagination Support**: Automatically handles pagination to load all workflows
- 🔗 **Direct Access**: Open workflows directly in HubSpot with one click
- 📋 **Copy Actions**: Copy workflow IDs and UUIDs to clipboard
- ⚡ **Real-time Search**: Fast, client-side filtering for instant results
- 🎨 **Status Indicators**: Visual indicators for enabled/disabled workflows

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure HubSpot API

1. Go to your HubSpot account
2. Navigate to Settings → Integrations → Private Apps
3. Create a new private app with the following scopes:
   - `automation` (required for workflows)
4. Copy your access token and portal ID

### 3. Configure Raycast Preferences

1. Open Raycast and run the "Search Workflows" command
2. Set your preferences:
   - **HubSpot API Key**: Your private app access token
   - **HubSpot Portal ID**: Your HubSpot portal ID

## Usage

1. Open Raycast (⌘ + Space)
2. Type "Search Workflows" or "HubSpot"
3. Start typing to search through your workflows
4. Use the actions:
   - **Enter**: Open workflow in HubSpot
   - **⌘ + C**: Copy workflow ID
   - **⌘ + ⇧ + C**: Copy workflow UUID
   - **⌘ + R**: Refresh workflows

## API Reference

This extension uses the [HubSpot Automation v4 API](https://developers.hubspot.com/docs/api-reference/automation-automation-v4-v4/workflows/get-automation-v4-flows) for workflows.

### Required Scopes
- `automation` - Access to workflow data

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build
```

## License

MIT
