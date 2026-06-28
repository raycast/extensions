# Clip - URL Shortener Changelog

## [Fix] - 2026-05-31

### 🐛 Bug Fix

- Fixed an issue where a history save failure (e.g. "Could not create extension support directory") would incorrectly report the URL shortening as failed, even though the URL was already shortened and copied to the clipboard

## [Initial Version] - 2026-04-13

### ✨ URL Shortening Functionality

- Added main command for shortening URLs with support for multiple URL shortening services
- Implemented a service registry to manage and select between different URL shortening providers
- Created service clients for multiple providers: **Bitly**, **Cuttly**, **TinyURL**, **is.gd**, and **v.gd**
- Added core shortening logic to coordinate URL shortening operations across different providers
- Implemented URL validation and processing utilities

### 📋 History & Storage

- Added a history command to view and manage previously shortened URLs
- Implemented persistent history storage for tracking all shortened URLs

### 🧪 Testing

- Created comprehensive test suite covering services, storage, and utilities
- Added Raycast API mocks for isolated testing\* Configured Vitest as the testing framework

### ⚙️ Project Configuration

- Set up project dependencies and build scripts
- Configured TypeScript and ESLint for code quality\* Set up semantic release for automated versioning
- Added pre-commit hooks for consistent code standards\* Included initialization and validation scripts
- Added comprehensive README documentation and MIT license
