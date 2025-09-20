# LaunchDarkly Extension for Raycast

> **Note**: This is an unofficial extension and is not affiliated with LaunchDarkly.

Quickly access and manage your LaunchDarkly feature flags directly from Raycast. View flag details, environments, and targeting rules without leaving your keyboard.

## Features

- 🔍 Search through all your feature flags
- 🏷️ View flag details including variations, targeting rules, and prerequisites
- 🌍 Manage multiple environments
- 👥 See maintainer and team information
- 🔄 Quick toggle between flag names and keys
- 🏃 Fast navigation with keyboard shortcuts
- 🔗 Open flag in LaunchDarkly web UI

## Setup

1. Get your LaunchDarkly API Access Token:
   - Log in to LaunchDarkly
   - Go to Account Settings
   - Navigate to Authorization
   - Create a new API token with `reader` role

2. Configure the Extension:
   - Open Raycast
   - Find "LaunchDarkly" extension
   - In the list of actions, select "Configure extension" (no need to open the extension)
   - Add your API token
   - (Optional) Set your default project key

## Usage

### List Feature Flags View
- Use `⌘ + Space` to open Raycast
- Type "ld" or "feature flags" to find the extension
- Search through your flags using the search bar
- Filter flags by state using the dropdown (Live/Deprecated/Archived)

Quick Actions in List View:
- `↵` View flag details
- `⌘ + ↵` Open flag in LaunchDarkly web UI
- Copy feature flag key to clipboard
- `⌘ + S` Toggle between showing flag names or keys
- `⌘ + F` Focus search

### Flag Details View
View complete flag information including:
- Current state and variations
- Environment-specific settings
- Targeting rules
- Prerequisites
- Maintainer information

Quick Actions in Details View:
- `↵` Open current environment in LaunchDarkly web UI
- `⌘ + ↵` Copy feature flag key to clipboard
- `⌘ + ⇧ + ↑/↓` Reorder environments
- `esc` Return to list view



