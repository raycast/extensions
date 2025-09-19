# CLAUDE.md - Azure DevOps Raycast Extension

## Project Overview
This is a Raycast extension for Azure DevOps integration that helps with work item management, branch and PR creation, and monitoring builds. It includes commands to check and list work items, browse backlog, view builds and pull requests, and create new work items.

## Prerequisites and Setup

### Required Tools
- **Azure CLI**: The extension uses the Azure CLI for all Azure DevOps operations
  - Install via Homebrew: `brew install azure-cli`
  - Detection order: `AZ_CLI` env var -> `az` on PATH -> common install paths
  - Must be authenticated: `az login`
  - Install Azure DevOps extension: `az extension add --name azure-devops`

### Configuration
Configure the extension preferences in Raycast settings:
- **Branch Prefix**: Prefix for branch names (e.g., `tor/`, `feature/`)
- **Azure DevOps Organization URL**: Your organization URL (e.g., `https://dev.azure.com/myorg`)
- **Azure DevOps Project**: (Optional) Default project name
- **Azure DevOps Repository**: (Optional) Repository name for branch operations
- **Source Branch**: Branch to create new branches from (default: `main`)

## Commands

### 1. Activate and Branch Work Item (`activate-and-branch`)
- Sets work item to active state
- Assigns work item to current user
- Creates a new branch in Azure DevOps
- Entry point: `src/activate-and-branch.tsx`

### 2. Check Work Item (`check-workitem`)
- Views work item details without making changes
- Generates URLs and suggested branch names
- Entry point: `src/check-workitem.tsx`

### 3. List My Work Items (`list-my-workitems`)
- Lists ALL work item types assigned to the current user (Tasks, User Stories, Bugs, Features, Epics, Product Backlog Items, etc.)
- Shows work item details, state, and last update with type-specific icons
- Filters out completed items (Closed, Removed, Done states)
- Provides actions to open, copy ID, title, or branch name
- Entry point: `src/list-my-workitems.tsx`

### 4. List Backlog (`list-backlog`)
- Browse backlog items with pagination (8 items per page)
- Shows backlog items ordered by StackRank (backlog priority) then creation date
- Includes Product Backlog Items, User Stories, Features, Epics, Bugs, and Tasks
- Client-side pagination with Previous/Next controls (⌘⇧←/⌘⇧→)
- Shows position in overall backlog and current page information
- Entry point: `src/list-backlog.tsx`

### 5. List Builds (`list-builds`)
- View active and recent completed builds
- Auto-refresh every 30 seconds (fixed to respect current page)
- Quick open and PR creation on successful builds
- Entry point: `src/list-builds.tsx`

### 6. List Pull Requests (`list-pull-requests`)
- View ALL active PRs in the project  
- Organized in sections: "Mine" (your PRs first) and "Active" (others, no duplicates)
- Shows complete project activity while prioritizing your work
- Quick open and copy actions
- Entry point: `src/list-pull-requests.tsx`

### 7. Create Items
- Create User Story (`src/create-user-story.tsx`) and generic Work Item (`src/create-work-item.tsx`)

## Technical Architecture

### Dependencies
- **@raycast/api**: Core Raycast API for UI components and system integration
- **@raycast/utils**: Utility functions for Raycast extensions
- Built with TypeScript and React
 - Azure CLI executed via `execFile` with argument arrays for safety (see `src/az-cli.ts`)

### Code Structure
```
src/
├── az-cli.ts                 # Azure CLI resolver and runner (execFile + args)
├── azure-devops-utils.ts     # DEPRECATED - Use azure-devops/ modules instead
├── azure-devops/            # Modular Azure DevOps operations
│   ├── index.ts             # Barrel export - main interface for all operations
│   ├── types.ts             # TypeScript interfaces and type definitions
│   ├── user-operations.ts   # User authentication and profile operations
│   ├── work-item-operations.ts # Core work item CRUD operations
│   ├── branch-operations.ts # Git branch management and naming
│   ├── pull-request-operations.ts # PR creation and management
│   ├── work-item-comments.ts # Work item comment operations
│   ├── work-item-relations.ts # Work item hierarchy and relationships
│   └── workflows.ts         # High-level combined operations
├── ActivateAndBranchForm.tsx # UI for activate + branch workflow
├── activate-and-branch.tsx   # Command entry
├── check-workitem.tsx        # Work item details viewer
├── list-my-workitems.tsx     # List assigned work items
├── list-backlog.tsx          # Backlog browser with pagination
├── list-builds.tsx           # Builds (active + recent) with auto-refresh
├── BuildLogsView.tsx         # Build details and PR creation from builds
├── list-pull-requests.tsx    # Active PRs (author/reviewer)
├── PullRequestDetailsView.tsx# PR details
├── create-user-story.tsx     # Create user story
├── create-work-item.tsx      # Create generic work item
└── components/              # Reusable UI components
    ├── AddCommentForm.tsx   # Comment creation form
    ├── RelatedItemsList.tsx # Display related work items
    ├── WorkItemActions.tsx  # Common work item actions
    ├── WorkItemMetadata.tsx # Work item metadata display
    └── WorkItemRelations.tsx# Work item relationship management
```

### Azure DevOps Integration
- Uses Azure CLI commands via Node.js `child_process.execFile` through `runAz`
- Safer argument handling (no shell string interpolation)
- Supports organization and project-specific operations
- Automatically detects project from work items when not configured

### Azure DevOps Utilities Architecture

The Azure DevOps integration is built around a modular architecture located in `src/azure-devops/`. All operations are exported through a barrel export pattern from `src/azure-devops/index.ts`, providing a clean interface for importing functionality.

#### Import Pattern
```typescript
// Import specific functions from the Azure DevOps utilities
import { 
  fetchWorkItemDetails, 
  getCurrentUser, 
  createBranch,
  type WorkItemDetails,
  type Preferences 
} from "../azure-devops";

// OR import everything
import * as AzureDevOps from "../azure-devops";
```

#### Available Operations by Module

**User Operations** (`user-operations.ts`)
- `getCurrentUser()`: Get current Azure user email via `az account show`

**Work Item Operations** (`work-item-operations.ts`)
- `fetchWorkItemDetails(id, preferences)`: Retrieve complete work item data
- `activateWorkItem(id, preferences)`: Set work item to active state and assign to user
- `getWorkItemLite(id, preferences)`: Get basic work item info (title, type, state)

**Branch Operations** (`branch-operations.ts`)
- `convertToBranchName(workItem, preferences)`: Generate standardized branch names
- `findExistingBranchesForWorkItem(id, preferences)`: Search for existing branches
- `createBranch(workItem, preferences)`: Create new branch in Azure DevOps

**Pull Request Operations** (`pull-request-operations.ts`)
- `createPullRequestFromWorkItem(workItem, preferences)`: Create PR with work item context

**Work Item Comments** (`work-item-comments.ts`)
- `getWorkItemCommentsCount(id, preferences)`: Get comment count for work item
- `getWorkItemComments(id, preferences)`: Retrieve all comments with details
- `addCommentToWorkItem(id, comment, preferences)`: Add new comment to work item

**Work Item Relations** (`work-item-relations.ts`)
- `getRelatedWorkItems(id, preferences)`: Get parent, children, and sibling work items

**High-Level Workflows** (`workflows.ts`)
- `activateAndCreatePR(workItem, preferences)`: Combined activate + branch + PR workflow

**Types** (`types.ts`)
- `Preferences`: Extension configuration interface
- `WorkItemDetails`: Complete work item data structure
- `WorkItemLite`: Minimal work item information
- `PullRequestResult`: PR creation result data
- `WorkItemComment`: Comment data structure

### Shared Utility Modules

**IMPORTANT**: Always use these existing utility modules instead of recreating similar functionality:

**Date Utilities** (`utils/DateUtils.ts`)
- `formatRelativeDate(dateString)`: Format dates as "2 days ago", "3 weeks ago"
- `formatDuration(startTime, finishTime)`: Format build/task durations (e.g., "5m 23s")
- `formatCompactDateTime(dateString)`: Split date and time for compact display
- `formatListDate(dateString)`: Combined relative and absolute date format

**Icon & Color Utilities** (`utils/IconUtils.ts`)
- `getWorkItemTypeIcon(type)`: Returns Raycast Icon for work item types
- `getStateColor(state)`: Returns color for work item states
- `getPullRequestStatusIcon(status, isDraft)`: Icon for PR status
- `getPullRequestStatusColor(status)`: Color for PR status
- `getBuildStatusIcon(status)`: Icon for build status
- `getBuildResultColor(result)`: Color for build results
- `getBuildStatusEmoji(status)`: Emoji representation of build status
- `getPullRequestStatusEmoji(status, isDraft)`: Emoji representation of PR status

**Authentication Error Handling** (`utils/AuthErrorHandler.ts`)
- `isAuthenticationError(error)`: Detects if error is authentication-related
- `handleAuthenticationError(error)`: Shows user-friendly auth error dialog
- `withAuthErrorHandling(fn)`: Wrapper function for automatic auth error handling
- `createLoginActionProps()`: Creates properties for a copy login command action
- `checkAuthentication()`: Checks if user is currently authenticated
- `getAuthErrorMessage(error)`: Gets user-friendly error message

**Authentication UI Component** (`components/AuthenticationEmptyView.tsx`)
- `AuthenticationEmptyView`: Ready-to-use empty view for authentication errors
- Shows the exact command: "Open Terminal and run this command: az login"
- Primary action (Enter): Copy `az login` to clipboard
- Additional actions: Copy full setup commands, Open documentation

## Development Guidelines for AI Agents

### Research & Development (R&D) with Azure DevOps Utilities

When working on this codebase, AI agents should leverage the Azure DevOps utilities for both research and development tasks:

#### For Exploring Data and Understanding the System

**Use the utilities to investigate:**
```typescript
// Research user context
const currentUser = await getCurrentUser();

// Explore work item structure
const workItem = await fetchWorkItemDetails("12345", preferences);
console.log("Work item structure:", JSON.stringify(workItem, null, 2));

// Investigate relationships between items
const relatedItems = await getRelatedWorkItems("12345", preferences);

// Explore comment patterns
const comments = await getWorkItemComments("12345", preferences);

// Research existing branch naming patterns
const branches = await findExistingBranchesForWorkItem("12345", preferences);
```

**Common R&D patterns:**
1. **Data Structure Discovery**: Use `fetchWorkItemDetails()` to understand Azure DevOps field structures
2. **Relationship Mapping**: Use `getRelatedWorkItems()` to understand work item hierarchies
3. **User Behavior Analysis**: Use `getCurrentUser()` and comment operations to understand user patterns
4. **Branch/PR Conventions**: Use branch operations to understand naming and creation patterns

#### For Adding New Functionality

**Step 1: Research First**
Always start by understanding existing patterns:
```typescript
// Before adding new work item operations, understand the data
const sampleWorkItem = await fetchWorkItemDetails("existing-id", preferences);
// Analyze the structure before creating new operations
```

**Step 2: Follow Modular Architecture**
When adding new functionality:

1. **Determine the appropriate module** based on operation type:
   - User-related → `user-operations.ts`
   - Work item CRUD → `work-item-operations.ts`
   - Git operations → `branch-operations.ts`
   - PR operations → `pull-request-operations.ts`
   - Comments → `work-item-comments.ts`
   - Relationships → `work-item-relations.ts`
   - Complex workflows → `workflows.ts`

2. **Add new types to `types.ts`** if needed:
   ```typescript
   export interface NewOperationResult {
     success: boolean;
     data?: SomeDataStructure;
     error?: string;
   }
   ```

3. **Export from the barrel export** (`index.ts`):
   ```typescript
   export { newOperation } from "./appropriate-module";
   ```

4. **Follow existing patterns**:
   - Use `runAz()` for Azure CLI operations
   - Handle errors gracefully with try/catch
   - Return consistent result structures
   - Include proper TypeScript types

**Step 3: Integration Patterns**
When integrating new functionality into UI components:

```typescript
// Import from the barrel export
import { newOperation, type NewOperationResult } from "../azure-devops";

// Use in React components with proper error handling
const [result, setResult] = useState<NewOperationResult | null>(null);

const handleNewOperation = useCallback(async () => {
  try {
    const result = await newOperation(params, preferences);
    setResult(result);
    showToast(Toast.Style.Success, "Operation completed");
  } catch (error) {
    showToast(Toast.Style.Failure, "Operation failed", error.message);
  }
}, [params, preferences]);
```

#### Best Practices for Agent Development

1. **Always research existing functionality** before creating new operations
2. **Understand the Azure CLI limitations** documented in this file
3. **Use the modular architecture** - don't add everything to one file
4. **Follow TypeScript patterns** - proper typing for all operations
5. **Test with real data** when possible using the utilities
6. **Maintain backward compatibility** when modifying existing operations
7. **Use the barrel export pattern** - never import directly from individual modules
8. **Follow UI/UX guidelines** including empty states and error handling

#### Command Discovery for New Features

Use Azure CLI help to discover new possibilities:
```bash
az boards --help           # Discover board operations
az repos --help            # Discover repository operations  
az pipelines --help        # Discover pipeline operations
az artifacts --help        # Discover artifact operations
```

Then implement following the modular pattern established in the codebase.

## Development Commands
- `npm run dev`: Start development mode
- `npm run build`: Build the extension
- `npm run lint`: Run linting
- `npm run fix-lint`: Fix linting issues
- `ray lint --fix`: Raycast's built-in linter and formatter (recommended for code verification)

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

## Azure CLI Command Quirks & Limitations

### Pull Request Commands
Different Azure CLI pull request commands have inconsistent parameter support:

- **`az repos pr list`**: Supports `--organization`, `--project`, and `--repository` parameters
  ```bash
  az repos pr list --status active --organization "https://dev.azure.com/myorg" --project "MyProject" --repository "MyRepo"
  ```

- **`az repos pr show`**: Only supports `--id`, `--organization`, `--detect`, and `--open`
  ```bash
  az repos pr show --id 123 --organization "https://dev.azure.com/myorg"
  ```
  ⚠️ **Important**: `az repos pr show` does NOT support `--project` or `--repository` parameters, despite other `repos` commands supporting them.

### Build Commands
- **`az pipelines build show`**: Supports both `--organization` and `--project` parameters
- **`az pipelines build list`**: Supports both `--organization` and `--project` parameters

### Work Item Commands
- **`az boards work-item show`**: Supports both `--organization` and `--project` parameters
- **`az boards query`**: Supports both `--organization` and `--project` parameters

### General Pattern
Most Azure DevOps CLI commands follow the pattern `--organization` + `--project`, but some commands (particularly `az repos pr show`) have reduced parameter support. Always check command help (`az [command] --help`) when encountering parameter errors.

## UI/UX Guidelines

### Empty State Views
All list components MUST include `List.EmptyView` components to provide friendly user feedback when no items are available:

```tsx
{!isLoading && items.length === 0 ? (
  <List.EmptyView
    icon="🎉"  // Choose appropriate emoji
    title="Friendly Empty State Title"
    description="Helpful description explaining why the list is empty and what users can do"
    actions={
      <ActionPanel>
        <Action
          title="Refresh"
          onAction={refreshFunction}
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </ActionPanel>
    }
  />
) : (
  // Regular list content
)}
```

**Required for all list views:**
- `list-my-workitems.tsx` ✅ - "Congratulations! You have no assigned tasks!"
- `list-backlog.tsx` ✅ - Context-aware for "Empty Backlog" vs "No Recent Work Items"
- `list-builds.tsx` ✅ - "No Builds Found"
- `list-pull-requests.tsx` ✅ - "No Pull Requests Found"

**Best Practices:**
- Use appropriate emojis that match the content type
- Provide encouraging/positive messaging when possible
- Include refresh action for easy retry
- Explain possible reasons for empty state
- Only show when `!isLoading` to avoid flashing during data fetching
