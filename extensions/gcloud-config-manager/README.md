# GCloud Config Manager for Raycast

A Raycast extension to easily manage Google Cloud SDK configurations. Create, duplicate, and switch between gcloud configurations with a few keystrokes.

## Features

- **List Configurations**: View all your gcloud configurations with their associated projects, accounts, and regions
- **Switch Configurations**: Quickly activate a different configuration
- **Create Configurations**: Create new configurations with project, account, and region settings
- **Duplicate Configurations**: Copy an existing configuration to create a new one
- **Delete Configurations**: Remove configurations you no longer need

## Prerequisites

- [Raycast](https://www.raycast.com/) installed
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and available in your PATH
- The `gcloud` command must be accessible from your terminal

## Installation

### Option 1: Install from Raycast Store (Recommended)

*Coming soon - this extension is not yet published to the Raycast Store*

### Option 2: Install Locally (Development Mode)

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd raycast-gcloud-config
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Open Raycast on your Mac:
   - Press `⌘ Space` to open Raycast
   - Type "Import Extension" and press Enter
   - Navigate to and select the `raycast-gcloud-config` directory
   - Click "Import"

5. The extension is now installed! You can access its commands by:
   - Opening Raycast (`⌘ Space`)
   - Typing any of the command names (see [Commands](#commands) section)

### Option 3: Development Mode (For Contributors)

If you want to develop or modify the extension:

1. Follow steps 1-2 from Option 2

2. Run in development mode:
   ```bash
   npm run dev
   ```

3. This opens the extension in Raycast's development mode where changes are reflected in real-time

## Usage

### List GCloud Configurations

1. Open Raycast (⌘ Space)
2. Type "List GCloud Configurations"
3. Press Enter to view all configurations
4. Use the action panel to:
   - Activate a configuration (Enter)
   - Delete a configuration (⌘ Delete)
   - Refresh the list

### Create GCloud Configuration

1. Open Raycast
2. Type "Create GCloud Configuration"
3. Fill in the form:
   - Configuration Name (required)
   - Project ID (optional)
   - Account Email (optional)
   - Region (optional, defaults to us-central1)
4. Press ⌘ Enter to create

### Duplicate GCloud Configuration

1. Open Raycast
2. Type "Duplicate GCloud Configuration"
3. Select the source configuration from the dropdown
4. The form will auto-populate with values from the source configuration
5. Edit any fields you want to change:
   - New Configuration Name (required)
   - Project ID (optional, can modify)
   - Account Email (optional, can modify)
   - Region (optional, can modify)
6. Press ⌘ Enter to create the new configuration

## Commands

- `list-configs` - List and manage gcloud configurations
- `create-config` - Create a new gcloud configuration
- `duplicate-config` - Duplicate an existing gcloud configuration

## Development

### Running in Development Mode

To run the extension in development mode:

```bash
npm run dev
```

This will open the extension in Raycast's development mode where you can test changes in real-time.

### Running Tests

This extension includes unit tests for core functionality:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Building for Distribution

To build the extension for distribution:

```bash
npm run build
```

The built extension will be available in the `dist` directory.

### Publishing to Raycast Store

To publish the extension to the Raycast Store:

```bash
npm run publish
```

This will guide you through the publishing process. You'll need to:
1. Have a Raycast account
2. Be logged in via the Raycast CLI
3. Follow the prompts to submit your extension

For more information, see the [Raycast Extension Publishing Guide](https://developers.raycast.com/basics/publish-an-extension).

## License

MIT
