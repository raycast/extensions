# Surge Changelog

## [Routine Maintenance] - {PR_MERGE_DATE}

- Mark this extension as macOS only
- Remove the past author contact information from readme
- Refactor project to ESM
- Rewrite all `.js(x)` files to `.ts(x)`
- Update all configuration files to Raycast's latest standards
- Bump all dependencies to the latest

## [Major refactoring and new standalone commands] - 2025-08-22

- **New standalone commands**: Added three new focused commands for quick access
  - `toggle-proxy`: Toggle system proxy setting with no-view mode for instant action
  - `switch-mode`: Dedicated command for switching outbound modes (Direct/Global Proxy/Rule-Based)
  - `switch-proxy`: Dedicated command for switching between proxy policies
- **TypeScript migration**: Updated project configuration to support TypeScript
  - Added TypeScript support with ES2023 target
  - Configured ESLint with @raycast/eslint-config for better code quality
  - Added type definitions for better development experience
- **Dependencies update**: Updated all dependencies to latest versions
  - Updated @raycast/api to ^1.101.1
  - Updated @raycast/utils to ^2.2.0
  - Added TypeScript and modern development tooling

## [Added support for remote Surge control] - 2024-01-02

- Add an option to set the host address of Surge instance
- Add an option to control whether to enable tls
- Automatic detect Surge platform
