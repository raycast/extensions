# Jira Search Self Hosted Changelog

## [Update] - {PR_MERGE_DATE}

### Added
- New "Create Issue" command with full form interface
  - Project selection with searchable dropdown
  - Issue type selection with icons
  - Priority selection with proper project-specific priorities
  - Support for all required fields based on project and issue type
  - Default settings for frequently used project, issue type and priority

### Improved
- Updated Raycast API to version 1.69.0 (from 1.36.0)
- Added @raycast/utils 1.19.0 for improved utilities and hooks
- Updated node-fetch to version 3.3.2
- Updated TypeScript and React type definitions
- Modular code structure for better maintainability
- Optimized API calls with smart fallback strategy
- Enhanced UX with reduced UI flickering during data loading
- Better error handling and validation

### Fixed
- Issue type icons display and "Unexpected icon path" warnings
- Dynamic fields rendering and validation
- Priority scheme handling for different project configurations

## [Fixed typo] - 2024-04-30

## [Update] - 2024-02-02

Added new `Open Issues` command that loads only open issues assigned to user owning token added to preferences. 

## [Update] - 2023-09-07

Updated dependencies

## [Update] - 2023-08-16

Added an ability to search projects by title and key case-insensitive

## [Update] - 2022-07-30

Added a new filter based on the assignee of a ticket. This filter can accept either the email address of the user, or the user's full name in quotes.

See all of your open tickets:
!open %john.smith@gmail.com
!open %"john smith"

## [Update] - 2022-06-16

- Updated Raycast API to 1.36.0
- Added the possibility to filter against ticket status (one or more) using "!" (exclamation mark)