# Lightdash Navigator

A Raycast extension to quickly search and open Lightdash dashboards, charts, and spaces.

## Features

- **Fast Search** - Find dashboards and charts by name, space, or description
- **Quick Access** - Open items in browser or copy links to clipboard
- **Secure Authentication** - Uses Personal Access Tokens

## Setup

### Prerequisites

- Access to a Lightdash instance (Cloud or self-hosted)
- A Personal Access Token
- Your project UUID

### Creating a Personal Access Token

1. Log in to your Lightdash instance
2. Click your avatar (bottom-left) and go to **Settings**
3. Navigate to **Personal access tokens**
4. Click **Generate new token**
5. Give it a descriptive name and (optionally) set an expiration date
6. Click **Create**
7. **Copy the token immediately** - it won't be shown again

### Finding Your Project UUID

The project UUID can be found in the URL when you're viewing any page in your project:

```
https://app.lightdash.cloud/projects/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/...
                                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                      This is your Project UUID
```

### Configuring the Extension

In the extension preferences, enter:

| Setting | Description |
|---------|-------------|
| **Lightdash Instance URL** | Your Lightdash URL (e.g., `https://app.lightdash.cloud`) |
| **Personal Access Token** | The token you created above |
| **Project UUID** | The UUID from your project URL |

## Usage

1. Open Raycast and type "Search Lightdash"
2. Start typing to filter dashboards and charts
3. Press Enter to open in browser, or Cmd+Shift+C to copy the URL
4. Press Cmd+R to refresh results

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Authentication Error** | Verify your Personal Access Token is correct and hasn't expired |
| **Project Not Found** | Check that the Project UUID is correct and you have access |
| **No Results** | Ensure the project has dashboards or charts |
| **Connection Error** | Check the instance URL includes `https://` |

## Privacy & Security

- Credentials are stored locally in Raycast's secure preferences
- The extension only connects to your specified Lightdash instance
- No data is sent to any third party
