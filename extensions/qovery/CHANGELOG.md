# Qovery Changelog

All notable changes to the Qovery Services Raycast Extension will be documented in this file.

## [Update] - 2026-08-05

### Changed

- Updated the extension and action icons to use Qovery's current logo

## [Update] - 2026-08-04

### Added

- Qovery browser authentication using OAuth 2.0 Authorization Code with PKCE
- Automatic access-token refresh using Raycast's secure OAuth token storage
- Service discovery across every organization accessible to the signed-in user
- Organization filtering and organization-aware service search

### Changed

- Removed the required API token preference and locally stored organization selection
- Updated the Raycast API, utilities, lint configuration, TypeScript, and formatting toolchain
- Updated Console service links to the current `/service/{id}/overview` route
- Load independent organization service lists in parallel and report partial failures
- Only offer public-link actions for service types supported by the Qovery API

## [Security Maintenance] - 2026-05-21

- Updated the extension to address security advisories.

## [1.0.0] - 2025-09-09

### Added

- Initial release of Qovery Services Raycast Extension
- Dynamic credential management with local storage
- Service list display with visual status indicators
- Quick actions for opening services in Qovery Console
- Copy service ID and name functionality
- Keyboard shortcuts for common actions
- Error handling and user-friendly messages
- Support for different service types (Applications, Containers, Databases, Jobs)
- Status indicators with color coding
- Secure credential storage using Raycast LocalStorage

### Technical Details

- Built with React and Raycast API
- Uses LocalStorage for credential persistence
- Implements proper error handling and validation
- Supports all Qovery service types
- Responsive UI with keyboard shortcuts

## [0.1.0] - 2025-08-31

### Development

- Initial project setup
- Basic extension structure
- API integration with Qovery
- UI components and styling
- Credential management system
