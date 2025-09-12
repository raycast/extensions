# CLAUDE.md - Azure DevOps Raycast Extension

## Project Overview
This is a Raycast extension for Azure DevOps integration that helps with work item management and branch creation. The extension provides commands to check work items, activate and create branches, generate branch names, and list work items assigned to the current user.

## Prerequisites and Setup

### Required Tools
- **Azure CLI**: The extension uses the Azure CLI for all Azure DevOps operations
  - Install via Homebrew: `brew install azure-cli`
  - The extension specifically looks for Azure CLI at: `/opt/homebrew/bin/az`
  - Must be authenticated: `az login`
  - Must have Azure DevOps extension: `az extension add --name azure-devops`

### Configuration
Configure the extension preferences in Raycast settings:
- **Branch Prefix**: Prefix for branch names (e.g., `tor/`, `feature/`)
- **Azure DevOps Organization URL**: Your organization URL (e.g., `https://dev.azure.com/myorg`)
- **Azure DevOps Project**: (Optional) Default project name
- **Azure DevOps Repository**: (Optional) Repository name for branch operations
- **Source Branch**: Branch to create new branches from (default: `main`)

## Commands

### 1. Generate Branch Name (`branchname`)
- Converts task descriptions to standardized branch name format
- Entry point: `src/branchname.tsx`

### 2. Activate and Branch Work Item (`activate-and-branch`)
- Sets work item to active state
- Assigns work item to current user
- Creates a new branch in Azure DevOps
- Entry point: `src/activate-and-branch.tsx`

### 3. Check Work Item (`check-workitem`)
- Views work item details without making changes
- Generates URLs and suggested branch names
- Entry point: `src/check-workitem.tsx`

### 4. List My Work Items (`list-my-workitems`)
- Lists ALL work item types assigned to the current user (Tasks, User Stories, Bugs, Features, Epics, Product Backlog Items, etc.)
- Shows work item details, state, and last update with type-specific icons
- Filters out completed items (Closed, Removed, Done states)
- Provides actions to open, copy ID, title, or branch name
- Entry point: `src/list-my-workitems.tsx`

### 5. List Backlog (`list-backlog`)
- Browse backlog items with pagination (8 items per page)
- Shows backlog items ordered by StackRank (backlog priority) then creation date
- Includes Product Backlog Items, User Stories, Features, Epics, Bugs, and Tasks
- Client-side pagination with Previous/Next controls (⌘⇧←/⌘⇧→)
- Shows position in overall backlog and current page information
- Entry point: `src/list-backlog.tsx`

### 6. List Active Builds (`list-active-builds`)
- View all active/running builds with real-time status updates
- Shows build status, duration, branch, and requested by information
- Auto-refresh every 30 seconds for live build monitoring  
- Pagination support for large build lists (15 items per page)
- Access to live log streaming for each build
- Entry point: `src/list-active-builds.tsx`

## Technical Architecture

### Dependencies
- **@raycast/api**: Core Raycast API for UI components and system integration
- **@raycast/utils**: Utility functions for Raycast extensions
- Built with TypeScript and React

### Code Structure
```
src/
├── branchname.tsx          # Branch name generation
├── activate-and-branch.tsx # Work item activation and branch creation
├── check-workitem.tsx      # Work item details viewer
└── list-my-workitems.tsx   # List assigned work items
```

### Azure DevOps Integration
- Uses Azure CLI commands via Node.js `child_process.exec`
- Commands are executed asynchronously with proper error handling
- Supports organization and project-specific operations
- Automatically detects project from work items when not configured

### Key Functions
- `getCurrentUser()`: Gets current Azure user via `az account show`
- `fetchWorkItem()`: Retrieves work item details via `az boards work-item show`
- `convertToBranchName()`: Converts work item info to branch name format
- `fetchMyWorkItems()`: Queries work items assigned to current user

## Development Commands
- `npm run dev`: Start development mode
- `npm run build`: Build the extension
- `npm run lint`: Run linting
- `npm run fix-lint`: Fix linting issues

## Error Handling
- Toast notifications for success/error states
- Console error logging for debugging
- Graceful handling of missing Azure CLI or authentication
- Fallback behaviors when optional configurations are missing

## Security Considerations
- Uses system-installed Azure CLI for authentication
- No API keys or secrets stored in extension
- Relies on Azure CLI's built-in authentication mechanisms
- Commands are executed with user's current Azure context