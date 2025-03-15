# Google Cloud Raycast Extension

A Raycast extension for managing Google Cloud resources.

## Features

### Storage Management
- View and manage storage buckets
- Browse objects within buckets
- Manage object versions
- Configure bucket lifecycle rules
- View storage statistics

### IAM Management
- Unified IAM management interface
- View and manage IAM permissions by principal (user, group, service account)
- View and manage IAM permissions by role
- Advanced view for detailed policy information
- Add and remove IAM bindings
- Support for conditional role bindings

## IAM Management

The IAM management functionality provides a unified interface for managing IAM permissions across Google Cloud resources. It offers three different views:

1. **By Principal View**: Organizes IAM data by member (user, group, service account), showing all roles assigned to each principal.
   - Accounts are grouped by type (User, Group, Service Account, etc.)
   - Each account shows its roles, permissions, and access level
   - Detailed view for each account with comprehensive permission information
   - Visual indicators for access levels (Admin, Editor, Viewer)

2. **By Role View**: Organizes IAM data by role, showing all members assigned to each role.
   - Roles are displayed with their descriptions and assigned members
   - Easy to see which accounts have specific roles

3. **Advanced View**: Provides a detailed view of the raw IAM policy with debugging information.
   - View the complete IAM policy in JSON format
   - Useful for troubleshooting and advanced users

### Key Features

- **Filter by Principal Type**: Quickly filter accounts by type (user, group, service account, etc.)
- **Search**: Search for specific accounts, roles, or emails
- **Add Members**: Add new members with specific roles
- **Remove Roles**: Remove roles from existing members
- **Conditional Bindings**: Support for adding conditions to role bindings
- **Detailed Information**: View detailed information about each account's permissions
- **Visual Indicators**: Icons and colors indicate different access levels and account types
- **Grouped View**: Accounts are organized by type for better visibility

### Shortcuts

- `cmd+shift+i`: Access IAM management from any resource
- `cmd+shift+n`: Add a new IAM member
- `cmd+r`: Refresh IAM policy

## Requirements

- Google Cloud SDK installed (`gcloud`)
- Authenticated with Google Cloud (`gcloud auth login`)
- Appropriate permissions to view and manage resources

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed on your machine
- A Google Cloud account with at least one project

## Installation

1. Clone this repository
2. Navigate to the directory
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start the development server in Raycast

## Usage

1. Open Raycast and search for "Google Cloud"
2. If not authenticated, click "Login to Google Cloud" to authenticate
3. Once authenticated, you'll see a list of your Google Cloud projects
4. Select a project to view available services and actions
5. Use the actions to interact with your Google Cloud resources

## Configuration

You can configure the path to your gcloud CLI in the extension preferences:

1. Open Raycast
2. Go to Extensions
3. Find "Google Cloud" and click on it
4. Click on "Preferences"
5. Set the path to your gcloud CLI (default is "gcloud")

## Development

- `npm run dev` - Start the development server
- `npm run build` - Build the extension
- `npm run lint` - Lint the code

## Keyboard Shortcuts

For a comprehensive list of keyboard shortcuts used in this extension and information about Raycast's reserved shortcuts, see [SHORTCUTS.md](docs/SHORTCUTS.md).

## License

MIT