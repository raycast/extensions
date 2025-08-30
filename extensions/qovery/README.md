# Qovery Services Raycast Extension

This Raycast extension displays all services from a Qovery organization with dynamic credential management.

## Features

- **Dynamic Credentials**: Enter your API token and organization ID directly in the extension
- **Secure Storage**: Credentials are stored locally and securely
- **Easy Management**: Change credentials anytime with keyboard shortcuts
- **Service List**: View all services in your Qovery organization
- **Status Indicators**: Visual status indicators for each service
- **Quick Actions**:
  - Open services directly in Qovery Console
  - Copy service IDs and names to clipboard
  - Refresh services list
  - Change credentials (⌘ + C)
  - Clear stored credentials

## Setup

1. **Install the extension** in Raycast
2. **First Run**: The extension will prompt you to enter your credentials
3. **Enter your credentials**:
   - Qovery API Token
   - Organization ID

### Getting your Qovery API Token

1. Log in to your Qovery account
2. Go to your profile settings
3. Navigate to the API Tokens section
4. Create a new API token

## Usage

1. Open Raycast
2. Type "Show Qovery Services" or use the command palette
3. If it's your first time, enter your credentials
4. View your services list
5. Use the action panel to:
   - Open services in Qovery Console
   - Copy service information
   - Refresh the list (⌘ + R)
   - Change credentials (⌘ + C)
   - Clear stored credentials

## Keyboard Shortcuts

- **⌘ + R**: Refresh services list
- **⌘ + C**: Change credentials
- **⌘ + Enter**: Submit credential form

### Changing Credentials

- Use the "Change Credentials" action in any view
- Or press ⌘ + C from the services list
- Enter new credentials and save

### Clearing Credentials

- Use the "Clear Credentials" action (destructive action)
- This will remove all stored credentials
- You'll need to re-enter them on next use

### Security

- Credentials are stored locally using Raycast's LocalStorage
- They are not transmitted anywhere except to Qovery's API
- You can clear them anytime using the clear action

## Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## License

MIT
