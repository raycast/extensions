# DevOps Branch Name Generator

A Raycast extension that converts work item descriptions to standardized branch names with Azure DevOps integration.

## Features

- 🌿 **Branch Name Generation**: Converts task descriptions to clean, standardized branch names
- 🔗 **Azure DevOps Integration**: Automatically fetches work item titles from Azure DevOps
- ⚙️ **Customizable Prefix**: Configure your preferred branch prefix (e.g., `tor/`, `feature/`, `bugfix/`)
- 📋 **Clipboard Integration**: Copies generated branch names directly to your clipboard

## Quick Start

1. Install the extension in Raycast
2. Search for "Branchname" in Raycast
3. Enter a work item number (e.g., "12345")
4. The extension will auto-fetch the work item title from Azure DevOps
5. Press Enter to generate and copy the branch name

## Setup

### Prerequisites

1. **Azure CLI**: Install the Azure CLI
   ```bash
   # Install Azure CLI (if not already installed)
   brew install azure-cli
   
   # Install Azure DevOps extension
   az extension add --name azure-devops
   ```

2. **Authentication**: Login to Azure
   ```bash
   az login
   ```

### Configuration

#### Option 1: Extension Settings (Recommended)
1. Open Raycast
2. Search for "Branchname" 
3. Press `⌘ + ,` to open extension settings
4. Configure:
   - **Branch Prefix**: Your preferred prefix (default: `tor/`)
   - **Azure DevOps Organization URL**: `https://dev.azure.com/yourorg`
   - **Azure DevOps Project**: Your project name (optional)

#### Option 2: Azure CLI Global Configuration
```bash
# Set default organization
az devops configure --defaults organization=https://dev.azure.com/YOUR_ORG_NAME

# Set default project (optional)
az devops configure --defaults project=YOUR_PROJECT_NAME
```

### Verify Setup

Test your configuration:
```bash
# Test Azure DevOps connection
az boards work-item show --id YOUR_WORK_ITEM_ID --output json
```

## Usage

### Basic Usage
1. Open Raycast and search for "Branchname"
2. Enter work item number: `12345`
3. Extension automatically fetches: "Display environment (Prod / Dev / UAT) on profile page"
4. Generated branch name: `tor/12345-display-environment-prod-dev-uat-on-profile-page`

### Manual Mode
If Azure DevOps integration isn't available:
1. Enter work item number: `99`
2. Manually type description: "Display environment (Prod / Dev / UAT) on profile page"
3. Generate branch name: `tor/99-display-environment-prod-dev-uat-on-profile-page`

## Configuration Options

| Setting | Description | Default | Example |
|---------|-------------|---------|---------|
| Branch Prefix | Prefix for all branch names | `tor/` | `feature/`, `bugfix/` |
| Azure Organization URL | Your Azure DevOps org URL | - | `https://dev.azure.com/myorg` |
| Azure Project | Default project name | - | `MyProject` |

## Troubleshooting

### "Failed to fetch work item"
- Ensure Azure CLI is installed: `az --version`
- Check if logged in: `az account show`
- Verify Azure DevOps extension: `az extension list`
- Test manually: `az boards work-item show --id 12345`

### "boards is not recognized"
Install the Azure DevOps extension:
```bash
az extension add --name azure-devops
```

### Authentication Issues
Re-login to Azure:
```bash
az login
az devops login
```

### Organization/Project Not Found
Configure defaults:
```bash
az devops configure --defaults organization=https://dev.azure.com/yourorg project=yourproject
```

## Examples

**Input**: Work Item #12345 "Implement user authentication with OAuth2"
**Output**: `tor/12345-implement-user-authentication-with-oauth2`

**Input**: Work Item #456 "Fix: Button alignment on mobile devices"
**Output**: `tor/456-fix-button-alignment-on-mobile-devices`

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Lint
npm run lint
```

## Support

For issues and feature requests, please check the extension settings first, then verify your Azure CLI configuration.