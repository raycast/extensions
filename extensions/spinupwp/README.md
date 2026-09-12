# SpinupWP

Manage your SpinupWP servers and WordPress sites directly from Raycast.

## Configuration

### Single Account Setup

1. Log in to your [SpinupWP dashboard](https://spinupwp.app)
2. Go to **Account Settings** → **API**
3. Click **Generate New Token**
4. Copy the token and paste it in the extension preferences

### Multi-Account Setup

The extension supports managing multiple SpinupWP accounts. Use the **SpinupWP Accounts** command to:

- Add multiple SpinupWP accounts
- Switch between accounts using the account dropdown in each command
- Edit or delete accounts
- Set an active account

When multiple accounts are configured, a dropdown selector appears in the search bar of each command, allowing you to quickly switch between accounts. The extension automatically uses the selected account for all API operations.

**Note:** If you only have one SpinupWP account, you can use either the single account setup (Default API token preference) or the multi-account system.

## Features

### Dashboard

- Quick link to open SpinupWP dashboard in browser

### Servers

- List all servers with status indicators
- View detailed server information (IP address, provider, region, disk usage, etc.)
- **Server Actions** (available in the action panel):
  - Reboot Server (with confirmation)
  - Restart Nginx
  - Restart Redis
  - Restart PHP-FPM
  - Restart MySQL (if database is present)
- **Quick Links**:
  - Open in SpinupWP
  - Copy IP Address

### Sites

- List all WordPress sites with status indicators
- View site details (PHP version, HTTPS status, cache status, Git configuration, etc.)
- **Cache Actions** (available in the action panel):
  - Purge Page Cache
  - Purge Object Cache
- **Maintenance** (available in the action panel):
  - Correct File Permissions
  - Run Git Deployment (if Git is configured)
- **Quick Links**:
  - Open Site
  - Open in SpinupWP
  - Copy Domain
- **Danger Zone**:
  - Delete Site (with confirmation dialog and options to delete associated database and backups)

### Events

- View recent events history
- Track failed and successful operations
- See event duration and details

### Accounts

- Manage multiple SpinupWP API accounts
- Add, edit, and delete accounts
- Set active account for all commands

