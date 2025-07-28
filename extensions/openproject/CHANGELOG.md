# Changelog

All notable changes to the OpenProject Raycast Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-01-28

### Added
- **Create Ticket Command**: Create new tickets in OpenProject with full form support
  - Subject and description fields
  - Project selection from user's accessible projects
  - Work package type selection (Bug, Feature, Task, etc.)
  - Optional assignee selection from project members
  - Optional priority setting
  - Real-time form validation and error handling

- **Search Tickets Command**: Search and browse existing tickets
  - Live search with 500ms debouncing for performance
  - Search by ticket subject/title
  - Color-coded status indicators (New, In Progress, Resolved, etc.)
  - Quick actions: Open in OpenProject, Copy URL, Copy ID
  - Detailed ticket preview with project, type, status, and dates
  - Formatted creation and update timestamps

- **Update Ticket Command**: Edit existing tickets with two-step process
  - Step 1: Search and select ticket to update
  - Step 2: Edit form with pre-filled current values
  - Update subject, description, assignee, priority, and status
  - Smart conflict detection and resolution
  - Only changed fields are sent to API for efficiency

- **OpenProject API Integration**
  - Full REST API v3 support
  - Basic authentication with API key
  - Comprehensive error handling with user-friendly messages
  - Connection testing and validation
  - Support for any OpenProject instance (cloud or self-hosted)

- **User Experience Features**
  - Intuitive command icons (Create ⊕, Search 🔍, Update ✏️)
  - Loading states and progress indicators
  - Toast notifications for success/error feedback
  - Keyboard shortcuts for efficient navigation
  - Responsive form validation

- **Configuration & Setup**
  - Simple preferences configuration in Raycast
  - OpenProject URL and API key setup
  - Connection validation and troubleshooting guidance
  - Comprehensive documentation and setup instructions

### Technical Implementation
- TypeScript implementation with full type safety
- React hooks for state management
- Debounced search for optimal performance
- Error boundary handling for robust user experience
- ESLint and Prettier code formatting
- Comprehensive logging for debugging

### Security & Privacy
- API keys stored securely in Raycast preferences
- No data persistence or caching of sensitive information
- Direct API communication without intermediary services
- Follows OpenProject API security best practices

### Documentation
- Comprehensive README with setup instructions
- API key creation guide
- Troubleshooting section for common issues
- Contributing guidelines for community development

---

## About This Extension

This is an **unofficial community extension** for OpenProject integration with Raycast. It is not developed, sponsored, or supported by OpenProject GmbH.

### Supported OpenProject Versions
- OpenProject 12.x and later
- Both cloud (openproject.com) and self-hosted instances
- Requires API v3 support (standard in all modern versions)

### Browser Compatibility
- Tested with major OpenProject cloud installations
- Compatible with self-hosted instances with proper SSL certificates
- Supports custom domains and subdirectories

### Future Roadmap
- Dashboard overview with ticket statistics
- Quick ticket creation from selected text
- Bulk operations support
- Custom field support
- Project-specific shortcuts
- Time tracking integration
- Notification support for ticket updates

For feature requests and bug reports, please visit our [GitHub repository](https://github.com/soulmate1337/open-project-raycast-extension).