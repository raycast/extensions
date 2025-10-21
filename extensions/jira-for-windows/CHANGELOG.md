# Changelog

All notable changes to the Jira Raycast Extension will be documented in this file.

## [1.1.0] - 2025-10-21

### Added
- **Mark as Done** action in Review Tasks (⌘+D)
  - Quick action to complete tasks and remove them from the list
  - Automatically finds and applies "Done" or "Complete" transition
  - Confirmation dialog to prevent accidental completion
  
- **Change Status** submenu in Review Tasks (⌘+T)
  - Shows all available status transitions for the selected task
  - Dynamically loads transitions based on the task's workflow
  - Updates task list automatically after status change
  
- **Refresh** action in Review Tasks (⌘+R)
  - Manually refresh the task list without reopening the command
  
- **API Methods**:
  - `getTransitions()` - Get available transitions for an issue
  - `transitionIssue()` - Transition an issue to a new status
  - `markAsDone()` - Quick method to complete tasks
  
### Changed
- Review Tasks action panel now organized into sections
- Task list automatically refreshes after status changes
- Improved error messages for transition failures

### Technical
- Added JiraTransition interface
- Enhanced review-tasks.tsx with status management
- API endpoints for transitions use v3 (required by Jira)

## [1.0.0] - 2025-10-21

### Added
- **Create Task Command**: Create new Jira tasks with comprehensive details
  - Title and description fields
  - Project selection (loads all accessible projects)
  - Issue type selection (dynamically loads based on project)
  - Deadline options with quick selections (Today, Tomorrow, 1 week, etc.)
  - Custom date picker for deadlines
  - Priority selection from available priorities
  - Labels selection from existing labels in the project
  
- **Review Tasks Command**: View and manage assigned tasks
  - Lists all tasks assigned to the current user
  - Sorted by deadline in ascending order
  - Shows task key, title, project, status, priority, and due date
  - Color-coded indicators for task urgency (overdue, today, upcoming)
  - Search functionality to filter tasks
  - Quick actions: Open in Jira, Copy issue key, Copy issue URL
  
- **Authentication**:
  - Secure API token-based authentication
  - Preferences for Jira domain, email, and API token
  - Basic Auth implementation with Jira REST API v3
  
- **User Experience**:
  - Loading states for async operations
  - Error handling with clear error messages
  - Success notifications with links to created tasks
  - Keyboard shortcuts for common actions
  - Visual indicators for priority and status
  
- **Documentation**:
  - Comprehensive README with setup instructions
  - Quick Start Guide for new users
  - Troubleshooting section
  - API reference documentation

### Technical Details
- Uses Jira REST API v3
- Built with TypeScript and React
- Raycast API version 1.103.0+
- Node.js 22.14+ required
- Secure credential storage via Raycast preferences

### API Endpoints Used
- `/rest/api/3/project/search` - List projects
- `/rest/api/3/priority` - List priorities
- `/rest/api/3/project/{projectKey}` - Get project details
- `/rest/api/3/issue` - Create issues
- `/rest/api/3/search` - Search issues with JQL

### Security
- API tokens used instead of passwords
- All API calls over HTTPS
- Credentials stored securely in Raycast
- No data cached or stored locally

### Known Limitations
- Only supports Jira Cloud (not Server or Data Center)
- Requires valid API token with appropriate permissions
- Limited to standard Jira fields (no custom fields in v1.0)
- Maximum 100 issues shown in review tasks (sorted by deadline)

### Future Enhancements (Planned)
- Support for custom fields
- Advanced filtering options in review tasks
- Bulk operations on tasks
- Comments and attachments support
- Sprint management
- Assign tasks to other users
- Time tracking integration
- Add watchers to issues
- Link issues together

---

## How to Update

To update to the latest version:

```bash
# Pull latest changes
git pull

# Install any new dependencies
npm install

# Rebuild the extension
npm run build
```

## Version History Format

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Types of Changes
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes

