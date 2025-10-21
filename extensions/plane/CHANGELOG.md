# Plane Changelog

## [Cycle and Member Filtering Improvements] - 2025-10-15

## Enhanced

- **Filter Cycles**: Show only active cycles (end date in the future)
- **Filter Members**: Exclude bot and intake email addresses from member lists
- **Terminology**: Changed "issue" to "work item" for consistency

## [Fix Issue in getProjectIcon] - 2025-10-13

### Fixed

- `getProjectIcon`: Extension was crashing due to different response in project logo (ref: [Issue #22144](https://github.com/raycast/extensions/issues/22144))

## [Search Projects + Filter Work Items] - 2025-10-13

### Added

- **Search Projects**: Ability to view projects and their work items (ref: [Issue #22093](https://github.com/raycast/extensions/issues/22093))

### Enhanced

- **Filter Work Items**: Enhanced command allowing user to filter by project

## [Initial Version] - 2025-10-09

### Added

- **Create Work Items**: Ability to create new work items with title, description, and assignee
- **Search Work Items**: Search functionality to find work items across projects and workspaces
- **View Work Item Details**: Detailed view of work items with all relevant information
- **Work Item Actions**: Context menu actions for work items including edit work item, status and priority updates
- **Authentication**: Secure authentication with Plane API
