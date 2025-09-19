# Azure DevOps Helper

Raycast extension for Azure DevOps that helps you browse work items and builds, create branches and PRs, and generate standardized branch names.

## Features

- 🌿 **Branch Names**: Generate standardized branch names from work items
- 🧩 **Work Items**: Check details, list your items, and browse backlog
- 🏗️ **Builds**: View active and recent builds with quick links
- 🔀 **Pull Requests**: List PRs where you’re author or reviewer; open details quickly
- 🚀 **Activate & Branch**: Set a work item Active, assign to self, create a branch, and optionally a PR
- ➕ **Create Items**: Create User Stories, Features, and Bugs with optional parent linking
- ⚙️ **Customizable Prefix**: Configure your preferred branch prefix (e.g., `tor/`, `feature/`)

## Quick Start

1. Install the extension in Raycast
2. Open any command, e.g. “List My Work Items”, “List Builds”, or “Activate and Branch Work Item”
3. Configure preferences if prompted (Org URL, Project, optional Repository)
4. Use actions to open in Azure DevOps, copy IDs/URLs, create branches/PRs

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
2. Search for any of the commands (e.g., “List My Work Items”, “List Builds”)
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

Key commands:
- `Activate and Branch Work Item`: Activate + assign work item, create branch, optional PR
- `Check Work Item`: View details and suggested branch name without changes
- `List My Work Items`: All items assigned to you; open, copy, or branch
- `List Backlog`: Browse backlog with pagination and quick actions
- `List Builds`: Active and recent builds; quick open and PR creation for successful runs
- `List Pull Requests`: Your authored/review PRs with quick open and copy
- `Create User Story` / `Create Work Item`: Create items with tags, assignee, and optional parent

## Configuration Options

| Setting | Description | Default | Example |
|---------|-------------|---------|---------|
| Branch Prefix | Prefix for all branch names | `tor/` | `feature/`, `bugfix/` |
| Azure Organization URL | Your Azure DevOps org URL | - | `https://dev.azure.com/myorg` |
| Azure Project | Default project name | - | `MyProject` |
| Azure Repository (Optional) | Repository name for branch operations | - | `MyRepo` |
| Source Branch | Default target branch for PRs and source for new branches | `main` | `main`, `develop` |

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
### Azure CLI Path
The extension auto-resolves the Azure CLI binary:
- Uses `AZ_CLI` env var if set
- Falls back to `az` on your `PATH`
- Tries common install paths (`/opt/homebrew/bin/az`, `/usr/local/bin/az`, `/usr/bin/az`)

If detection fails, ensure Azure CLI is installed and accessible from your shell.
