# Plane Raycast Extension

A powerful Raycast extension for managing work items in [Plane](https://plane.so), the open-source project management tool. This extension allows you to create, search, view, and manage work items directly from your macOS command palette.

## Features

### 🚀 Core Commands

- **Create Work Item** - Create new work items with comprehensive details
- **Search Work Items** - Search work items across all projects by title or ID
- **Search Projects** - View projects and their work items

### ✨ Work Item Management

- **Create Work Items** with:
  - Title and description (with Markdown support)
  - Project selection
  - State assignment
  - Priority levels (None, Low, Medium, High, Urgent)
  - Label assignment
  - Cycle assignment
  - Module assignment
  - Assignee selection
  - Start date and due date selection

- **Edit Work Items** with:
  - Full form editing for all work item properties
  - Real-time updates
  - Markdown support in descriptions
  - Start date and due date selection

- **Quick Actions** on work items:
  - Edit work item (⌘⇧E)
  - Update state (⌘⇧S)
  - Update priority (⌘⇧P)
  - View detailed work item information

### 🔍 Search & Discovery

- Global search across all projects and workspaces
- Real-time search with throttling for performance
- Filter by project, state, priority, and other properties
- Detailed work item views with all metadata

## Installation

Install the extension from the Raycast Store, then follow the authentication steps below.

## Authentication

### OAuth Authentication (Recommended)

For **Plane Cloud** users, OAuth provides the simplest authentication experience:

1. Open Raycast and run any Plane command
2. Click "Authorize" when prompted
3. Complete the OAuth flow in your browser
4. Return to Raycast - you're ready to go!

### API Key Authentication

For both **Plane Cloud** and **Self-Hosted** instances:

1. Get your API key from Plane:
   - Go to your Plane workspace
   - Navigate to **Settings** → **Account** → **Personal Access Tokens** 
   - Create a personal access token

2. Configure the extension:
   - Open Raycast preferences (⌘,)
   - Navigate to **Extensions** → **Plane**
   - Enter your **API Key**
   - For self-hosted instances, also provide:
     - **API Base Path** (e.g., `https://your-plane.com`)
     - **App Base URL** (e.g., `https://your-plane.com`)
   - Trailing slashes are fine, and so is a pasted `https://your-plane.com/api/v1`; the extension normalizes both.

3. Set your workspace:
   - Run any Plane command
   - Enter your **workspace slug** when prompted
   - You can find your workspace slug in your Plane URL: `plane.so/your-workspace-slug` (pasting the URL works too)

### Self-Hosted (Community Edition) Notes

- Plane allows 60 API requests per minute per key. If you hit the limit, wait a minute and retry.
- If a command reports "Check API Base Path", make sure the preference points at your Plane host (e.g. `https://plane.example.com`).

## Usage

### Creating Work Items

1. Open Raycast (⌘ Space)
2. Type "Create Work Item" or use the shortcut
3. Fill in the work item details:
   - Select a project
   - Enter title and description
   - Choose state, priority, labels
   - Assign to cycles, modules, and team members
4. Press Enter to create

### Searching Work Items

1. Open Raycast (⌘ Space)
2. Type "Search Work Items"
3. Enter your search query
4. Browse and select work items
5. Use quick actions to update state, priority, or edit

### Quick Actions

When viewing work items, you can use these keyboard shortcuts:

- **⌘⇧E** - Edit work item
- **⌘⇧S** - Update state
- **⌘⇧P** - Update priority
- **⌘⇧O** - Open work item details

### Key Components

- `CreateWorkItemForm` - Comprehensive work item creation
- `EditWorkItemForm` - Work item editing interface
- `WorkItemDetail` - Detailed work item view
- `WorkItemActions` - Quick action menus
- `SearchWorkItems` - Global search interface

Made with ❤️ for the Plane community
