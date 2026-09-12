# End Of Life Changelog

## [Windows Support] - 2025-08-04

- Added support for Windows

## [Use official API] - 2025-07-29

- **Major Refactor**: Migrated to use the official endoflife.date API
- **Dependencies**: Updated and bumped package dependencies
- **Code Quality**: Fixed linting and formatting issues
- **Dependencies**: Replaced node-fetch with Raycast's built-in `useFetch` hook
- **Architecture**: Restructured codebase organization
  - Moved detail view to the `src/views` directory
  - Updated TypeScript types definitions
- **Configuration**:
  - Migrated from `.eslintrc.json` to `eslint.config.js`
  - Updated TypeScript configuration
  - Updated Prettier configuration

## [Fixed Warnings] - 2024-09-06

- Fixed warnings in React list rendering

## [Initial Version] - 2024-03-18

- Initial version
