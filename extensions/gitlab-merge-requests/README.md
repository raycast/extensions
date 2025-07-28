# GitLab MR Manager

A Raycast extension to browse GitLab projects and their merge requests.

## Features

- 🔍 Browse all your GitLab projects
- 📋 View open merge requests for any project
- 🔗 Quick access to GitLab web interface
- 📋 Copy MR URLs and titles to clipboard
- 🎯 Search and filter projects and MRs
- ⚡ Fast navigation between projects and MRs

## Setup

1. Get your GitLab Personal Access Token:
   - Go to your GitLab instance (e.g., gitlab.com)
   - Navigate to User Settings > Access Tokens
   - Create a new token with `api` scope
   - Copy the token

2. Configure the extension:
   - Open Raycast
   - Search for "GitLab MR Manager"
   - Go to extension preferences
   - Add your GitLab URL (e.g., https://gitlab.com)
   - Add your Personal Access Token
   - **Add your Project IDs** (comma-separated list of GitLab project IDs you want to monitor, e.g., `572,602,1150`)

## Usage

1. Launch the "List Merge Requests" command
2. Browse and search through your GitLab projects
3. Select a project to view its open merge requests
4. Use actions to:
   - Open MRs in GitLab
   - Copy URLs to clipboard
   - Navigate back to projects

## Features

### Project View
- Search projects by name or namespace
- View project descriptions
- Quick access to project URLs

### Merge Request View
- View all open MRs for a project
- See MR status (draft, conflicts, etc.)
- View author, assignees, and timestamps
- See source and target branches
- Search MRs by title, author, or branch names

### Visual Indicators
- 🟢 Open MR
- 🟣 Merged MR
- 🔴 Closed MR or conflicts
- 🟠 Draft MR

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Lint and fix
npm run fix-lint
```

## Configuration

### Required Settings

- **GitLab URL**: Your GitLab instance URL (e.g., https://gitlab.com)
- **Personal Access Token**: GitLab token with `api` scope
- **Project IDs**: Comma-separated list of GitLab project IDs to monitor (e.g., `572,602,1150,1032`)

### Finding Project IDs

To find your GitLab project IDs:
1. Go to your project in GitLab
2. The project ID is displayed below the project name on the project overview page
3. Alternatively, you can find it in the project settings or API responses

## Requirements

- Raycast
- GitLab instance with API access
- Personal Access Token with `api` scope
