# Port

Access your [Port](https://getport.io) internal developer portal directly from Raycast. Browse dashboards, run self-service actions, search your software catalog, and ask Port AI questions.

## Features

- **Browse Dashboards** - View and open your Port dashboards and catalog pages
- **Run Self-service Actions** - Execute self-service actions from your portal
- **Search Entities** - Search across your entire software catalog
- **Ask Port AI** - Get answers about your infrastructure and services

## Setup

This extension requires Port API credentials to authenticate with your Port organization.

### Getting Your Credentials

1. Log in to your [Port dashboard](https://app.getport.io)
2. Navigate to **Settings** > **Credentials**
3. Copy your **Client ID** and **Client Secret**

### Configuring the Extension

1. Open Raycast and run any Port command
2. You'll be prompted to enter your credentials:
   - **Client ID** - Your Port API Client ID
   - **Client Secret** - Your Port API Client Secret
   - **Base URL** (optional) - Defaults to `https://api.getport.io`. Change this if you're using a different region (e.g., `https://api.us.getport.io` for US region)

## Commands

| Command                 | Description                                        |
| ----------------------- | -------------------------------------------------- |
| Browse Dashboards       | List and open Port dashboards and catalog pages    |
| Run Self-service Action | Browse and execute self-service actions            |
| Search Entities         | Search your software catalog by name or identifier |
| Ask Port AI             | Ask questions and get AI-powered answers           |

## Links

- [Port Documentation](https://docs.port.io)
- [Port Dashboard](https://app.getport.io)
- [API Reference](https://docs.port.io/api-reference/port-api)
