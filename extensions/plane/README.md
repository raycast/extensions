<p align="center">
  <img src="./assets/plane-icon.png" width="150" height="150" />
</p>

# Plane Raycast Extension

A powerful Raycast extension for managing work items in [Plane](https://plane.so), the open-source project management tool. This extension allows you to create, search, view, and manage work items directly from your macOS command palette.

## Features

### 🚀 Core Commands

- **Create Work Item** - Create new work items with comprehensive details
- **Search Work Items** - Search and filter work items across all projects
- **My Work Items** - View your assigned work items (placeholder for future implementation)
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

- **Edit Work Items** with:
  - Full form editing for all work item properties
  - Real-time updates
  - Markdown support in descriptions

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

1. Install the extension from the Raycast Store
2. Open Raycast (⌘ Space)
3. Type "Plane" and select the extension
4. Authenticate with your Plane workspace when prompted

## Configuration

The extension works with both Plane Cloud and self-hosted instances. Configure your instance in Raycast preferences:

- **API Base Path**: Your Plane API endpoint (default: `https://api.plane.so`)
- **App Base URL**: Your Plane app URL (default: `https://app.plane.so`)
- **API Key**: Your Plane API key (optional, OAuth is preferred)

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
