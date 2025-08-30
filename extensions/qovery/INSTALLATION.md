# Installation Guide - Qovery Services Raycast Extension

## Prerequisites

- Raycast installed on your Mac
- A Qovery account with API access
- Your Qovery API token
- Your Qovery organization ID

## Installation Steps

### 1. Install the Extension

1. Open Raycast
2. Go to Extensions (⌘ + Shift + E)
3. Click the "+" button to add a new extension
4. Select "Import Extension"
5. Choose the folder containing this extension

### 2. First Run Configuration

1. In Raycast, search for "Show Qovery Services"
2. Run the command
3. You'll see a form asking for your credentials:
   - **Qovery API Token**: Your personal API token from Qovery
   - **Organization ID**: Your Qovery organization ID
4. Fill in both fields and click "Save and Load Services"

### 3. Get Your Qovery API Token

1. Log in to your Qovery account at https://console.qovery.com
2. Go to your profile settings (click your avatar in the top right)
3. Navigate to "API Tokens" in the left sidebar
4. Click "Create a new API token"
5. Give it a name (e.g., "Raycast Extension")
6. Copy the generated token

### 4. Get Your Organization ID

Your organization ID can be found in the URL when you're viewing your organization in the Qovery console:

```
https://console.qovery.com/organization/{organization-id}/...
```

For example, if your URL is:

```
https://console.qovery.com/organization/3d542888-3d2c-474a-b1ad-712556db66da/project/...
```

Then your organization ID is: `3d542888-3d2c-474a-b1ad-712556db66da`

## Usage

1. Open Raycast (⌘ + Space)
2. Type "Show Qovery Services" or search for "Qovery"
3. Press Enter to run the command
4. View your services list
5. Use the action panel to:
   - Open services in Qovery Console
   - Copy service IDs and names
   - Refresh the list (⌘ + R)
   - Change credentials (⌘ + C)
   - Clear stored credentials

## Managing Credentials

### Changing Credentials

You can change your credentials anytime:

1. From the services list, press ⌘ + C or use "Change Credentials" action
2. Enter your new API token and/or organization ID
3. Click "Save and Load Services"

### Clearing Credentials

To remove all stored credentials:

1. Use the "Clear Credentials" action (destructive action)
2. Confirm the action
3. You'll need to re-enter credentials on next use

### Keyboard Shortcuts

- **⌘ + R**: Refresh services list
- **⌘ + C**: Change credentials
- **⌘ + Enter**: Submit credential form

## Troubleshooting

### "API Token and Organization ID are required"

- Make sure you've entered both credentials in the form
- Check that your API token is correct and not expired

### "Invalid API token"

- Verify your API token is correct
- Make sure the token has the necessary permissions
- Try creating a new API token

### "Organization not found"

- Check that your organization ID is correct
- Make sure you have access to the organization

### No services shown

- Verify that your organization has services
- Check that your API token has permission to view services
- Try refreshing the list (⌘ + R)

### Credentials not saving

- Try clearing credentials and re-entering them
- Check that you have proper permissions for local storage

## Features

- **Dynamic Credentials**: Enter credentials directly in the extension
- **Secure Storage**: Credentials stored locally using Raycast's LocalStorage
- **Easy Management**: Change credentials anytime with keyboard shortcuts
- **Service List**: View all services in your organization
- **Status Indicators**: Visual status indicators for each service
- **Quick Actions**:
  - Open services directly in Qovery Console
  - Copy service IDs and names to clipboard
  - Refresh the services list
  - Change credentials (⌘ + C)
  - Clear stored credentials
- **Service Types**: Different icons for applications, containers, databases, and jobs
- **Status Colors**:
  - 🟢 Running
  - 🔴 Stopped
  - 🟡 Deploying
  - ❌ Error
  - ⚪ Unknown

## Security

- Credentials are stored locally using Raycast's LocalStorage
- They are not transmitted anywhere except to Qovery's API
- You can clear them anytime using the clear action
- No credentials are stored in the extension code or configuration files

## Support

If you encounter any issues, please check:

1. Your internet connection
2. Your Qovery API token permissions
3. Your organization access rights
4. The Qovery API status at https://status.qovery.com
5. Try clearing and re-entering your credentials
