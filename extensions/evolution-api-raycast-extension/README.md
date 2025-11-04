# Evolution API - Raycast Extension

This extension lets you interact with evolution API and helps you in WhatApp automation

## Setup

1. Start Evolution API locally (example):

```bash
docker run -d \
  --name evolution_api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=change-me \
  atendai/evolution-api:latest
```

2. In Raycast preferences for this extension, set:

- **Evolution API Base URL**: `http://localhost:8080` (or your server URL)
- **API Key**: The value you set in `AUTHENTICATION_API_KEY`

3. Use the **Settings & Status** command to verify your configuration

Docs: [Introduction](https://doc.evolution-api.com/v1/en/get-started/introduction)

### Authentication

This extension uses a custom **API Key header** for authentication:

- Header: `apikey: YOUR_API_KEY`
- The API key is sent with every request automatically

All requests include the `apikey` header with your configured API key value.

### Automatic Configuration Check

All commands automatically verify that your Evolution API settings are configured before executing. If settings are missing or invalid, you'll be prompted to configure them via the extension preferences.

## Commands

### Configuration

- **Settings & Status**: View current configuration, validate settings, and quick access to Evolution API docs, Swagger UI, and Manager UI.

### Instance Management

- **Create Instance**: Create a new WhatsApp instance with configurable integration type (Baileys, Business, or Evolution).
- **Manage Instances**: Comprehensive instance management with:
  - List view showing all instances with status indicators
  - Color-coded status (green=open, red=closed, yellow=unknown)
  - Profile information and integration type
  - **View Details & Get QR Code**: Push to detail view to:
    - See full instance information
    - Get QR code for scanning with WhatsApp
    - Get pairing code for phone number linking
    - View profile picture and status
  - Restart, check status, logout, and delete actions
  - Real-time refresh capability

### Messaging

- **Send Message**: Send a single text message to a recipient.
- **Send Bulk Messages**: Send text messages to multiple recipients (comma or newline separated) with:
  - **Optional pre-send validation** - Automatically validate and skip invalid numbers before sending
  - Automatic duplicate removal
  - Configurable delay between messages
  - CSV report generation showing sent/failed/skipped status
  - Link preview option
- **Send Media**: Send images, videos, audio, or documents with optional captions.
- **Send Status/Stories**: Post WhatsApp status/stories (text, image, video, audio) to all contacts or specific recipients.
- **Send Sticker**: Send stickers via URL or base64.
- **Send Location**: Share location with coordinates, name, and address.
- **Send Contact**: Share contact cards with full details (name, number, organization, email, URL).
- **Send Reaction**: React to messages with emojis.
- **Send Poll**: Create interactive polls with multiple-choice options.
- **Send Interactive List**: Send interactive list messages with sections and rows.

### Utilities

- **Check WhatsApp Numbers**: Verify which numbers from a list are registered on WhatsApp (returns raw JSON).
- **Validate WhatsApp Numbers**: Enhanced validation tool that checks multiple numbers and displays valid/invalid results separately with:
  - **Automatic duplicate removal** - Filters out duplicate numbers before validation
  - Visual summary with count of valid vs invalid numbers
  - Separate sections for valid and invalid numbers with detailed list view
  - Color-coded status indicators (green for valid, red for invalid)
  - **Quick copy actions**:
    - Copy all valid numbers only (`⌘V`)
    - Copy all invalid numbers only (`⌘I`)
    - Copy full formatted report (`⌘A`)
    - Copy individual numbers (`⌘C`)
  - Search functionality to filter results
  - Toast notifications showing duplicate count and validation results
- **Set Presence**: Set instance online status (available/unavailable).

## Features

- **Multi-step workflows**: Create instances, configure settings, and send messages.
- **Bulk operations**: Send messages to multiple recipients with progress tracking and reporting.
- **Rich media support**: Send various media types including files, locations, contacts, polls, and interactive lists.
- **Action Panel integration**: Follows Raycast UI patterns ([Action Panel API](https://developers.raycast.com/api-reference/user-interface/action-panel)).
- **Error handling**: Comprehensive error messages and toast notifications.

## API Coverage

This extension implements all major Evolution API endpoints from the OpenAPI specification:

- Instance management (create, fetch, connect, restart, logout, delete, presence)
- Text messaging (single and bulk)
- Media messaging (files, audio, video, images, documents)
- Special message types (status, stickers, locations, contacts, reactions, polls, lists)
- Utilities (check WhatsApp numbers, connection state)
