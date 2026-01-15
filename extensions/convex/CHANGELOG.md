# Convex Tools Changelog

## [Unreleased]

### Added

- **View Convex Documentation** - Browse and search 60+ Convex documentation links organized by category
- **View Convex Components** - Browse 30+ Convex components with install commands and npm stats
- **Enhanced View Logs**
  - Function call tree visualization showing parent-child execution relationships
  - Collapsible console output (⌘L to toggle)
  - Request-level filtering to view all executions in a request
  - Enhanced metadata showing execution environment, caller, and identity
  - Copy execution ID action
- **Enhanced Browse Tables**
  - Improved document detail view with metadata panel
  - All fields displayed including `_id` and `_creationTime`
  - Collapsible raw JSON view (⌘J to toggle)
  - Better field value formatting for timestamps, objects, and arrays

### Changed

- Updated log display to match Convex dashboard styling
- Improved document browsing UX with cleaner layout
- Console output now starts collapsed by default in logs
- Renamed "Switch Project" command to "Manage Projects" for clarity
- Improved authentication flow - users are now properly logged out when signing out

### Fixed

- Fixed search functionality in Manage Projects - teams, projects, and deployments can now be filtered by name and slug
- Fixed authentication state management to properly reflect logout across the UI

## [Initial Version] - 2026-01-15

### Added

- **Switch Convex Project** - Navigate between teams, projects, and deployments
- **Run Convex Function** - Execute queries, mutations, and actions with argument input
- **Browse Convex Tables** - View and search documents in your tables
- **View Convex Logs** - Stream real-time function execution logs
- OAuth authentication with Convex
