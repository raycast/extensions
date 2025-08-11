# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - {PR_MERGE_DATE}

### Added
- **French Number Formatting**: Proper French formatting for share capital with non-breaking spaces as thousand separators and comma as decimal separator
- **Decimal Places Handling**: Always display exactly 2 decimal places (e.g., 675,2 becomes 675,20)
- **Missing Legal Form Codes**: Added codes 5598 and 5599 for "Société anonyme (SA)"
- **Output Template Documentation**: Added comprehensive template examples in README for both corporate entities and individual entrepreneurs

### Changed
- **SIREN Formatting**: Updated to use non-breaking spaces between digit groups (784608416 → 784 608 416)
- **Currency Display**: Added non-breaking space between amount and € symbol to prevent line breaks
- **Repository References**: Updated all repository URLs to match renamed repository (french-company-search)
- **Greptile Compliance**: Implemented code quality improvements for Raycast Store publication compliance

### Fixed
- **Share Capital Display**: Large numbers now properly formatted (9077707050 € → 9 077 707 050,00 €)
- **Legal Form Recognition**: Fixed missing SA (Société Anonyme) form codes causing display of numeric codes instead of readable labels

## [1.0.1] - 2025-08-08

### Changed
- **Security & Code Cleanup**: Performed a major cleanup of the codebase to improve security, performance, and reliability.
- **Enhanced Security**: Removed all direct file system access (`fs`, `path`) to comply with Raycast's sandboxed environment, preventing critical vulnerabilities.
- **Improved Performance**: Implemented caching for the authentication token, reducing redundant API login calls and speeding up searches.
- **Better Error Handling**: Replaced blocking error pages with non-intrusive `Toast` notifications for a smoother user experience.
- **Code Simplification**: Refactored complex rendering logic, removed recursive API calls, and simplified the overall architecture to make it more robust and maintainable.
- **Linting & Formatting**: Fixed all code style issues to align with Raycast's CI/CD validation standards.

## [1.0.0] - {PR_MERGE_DATE}

### Added
- **Core Feature**: Search French companies by SIREN/SIRET via INPI API
- **RCS Data Enhancement**: Integration with Datainfogreffe "Communes - Greffes" dataset to determine RCS city from postal code
- **Individual Entrepreneurs Support**: Extension now handles individual entrepreneurs with dedicated detailed format (name, birth date/place, address, etc.)
- **Extended Mapping Tables**: Complete lists for legal forms and representative roles based on INPI data dictionary
- **Rich Text Copy**: HTML and plain text clipboard support for Word compatibility
- **Enter Key Shortcut**: Quick search with Enter key (no need for Cmd+Enter)
- **Comprehensive Documentation**: Detailed README.md with installation and configuration guides

### Features
- **Multi-format Input**: Accepts both 9-digit SIREN and 14-digit SIRET numbers
- **Legal Text Formatting**: Generates properly formatted French legal text for contracts
- **Smart Representative Detection**: Identifies primary legal representative with role hierarchy
- **Address Formatting**: Constructs complete French address format from API data
- **Fallback Handling**: Graceful degradation with placeholder values for missing data
- **Error Handling**: User-friendly error messages with actionable guidance

### Technical
- Built with TypeScript for type safety
- Raycast API integration for native macOS experience
- Rate limiting and retry mechanisms for API stability
- Secure credential storage through Raycast preferences
- Development logging in development mode only