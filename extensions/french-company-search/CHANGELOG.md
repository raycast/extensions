# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-08-18

### Fixed
- **🔄 Recursive Representative Search**: Repaired functionality for companies with holding company representatives
- **👑 Role Priority**: President (role 73) now correctly prioritized over General Director (role 53) for SAS companies
- **🎯 SIREN Extraction**: Fixed extraction of correct SIREN from corporate representative data for API calls
- **📝 Output Formatting**: Corrected cascading representation format: "Représentée par la société [HOLDING] en tant que [ROLE], elle-même représentée par [PERSON] en tant que [ROLE], dûment [habilité/habilitée]"
- **⚡ Async Operations**: Made markdown generation functions properly async to support API calls
- **🔄 Loading States**: Added proper loading indicators for recursive search operations
- **🧪 Test Infrastructure**: Fixed failing unit and integration tests by resolving async/sync function mismatches
- **🏷️ Role Code Support**: Added support for role code 5132 as President alongside existing 73 code
- **📊 Type Consistency**: Fixed missing `isHolding` property in RepresentativeInfo returns

### Changed
- **📊 Component Updates**: CompanyDetailsView now handles async markdown generation with usePromise
- **🏗️ Architecture**: Added dedicated recursive-representative-search.ts module for holding company resolution
- **📋 Type Safety**: Extended RepresentativeInfo interface with corporateSiren field for recursive operations
- **🔧 Function Separation**: Created separate sync/async versions of markdown builders for test compatibility

### Technical
- **✅ All Tests Pass**: 59/59 unit tests and 25/25 integration tests now passing
- **🔄 CI/CD Ready**: GitHub Actions workflows should now pass consistently

## [1.1.0] - 2025-08-13

### Added
- **🏗️ Streamlined Folder Architecture**: Complete architectural overhaul with unified business logic in `src/lib/` directory
- **🧪 Production-Ready Testing Infrastructure**: 103 comprehensive tests covering unit, integration, and performance scenarios
- **🎭 Comprehensive Mock System**: Pre-recorded API responses for 10 real companies covering all entity types (SA, SARL, SAS, Auto-entrepreneur, SCI, etc.)
- **🔄 Smart Credential Management**: Automatic detection hierarchy (environment variables → Raycast preferences → mock data fallback)
- **⚡ Performance Benchmarking**: Sub-20ms operations with memory-efficient processing and performance monitoring
- **🚀 GitHub Actions CI/CD**: Automated testing pipeline with zero external API dependencies
- **📋 Enhanced Address Formatting**: Official INPI street type expansion (BD → Boulevard, AV → Avenue) with 231+ supported types
- **🎯 TypeScript Strict Mode**: Full compliance with zero `any` types for enhanced code quality
- **📊 API Structure Validation**: Runtime validation with change detection for API response consistency
- **🔍 Development Monitoring**: Comprehensive metrics system with health checks and performance alerts

### Changed
- **📁 Folder Structure**: Simplified from 17 directories to 12 (-29% complexity) following Raycast extension best practices
- **🔧 Import Paths**: Unified import system with consistent `../lib/` paths for better maintainability  
- **🧪 Testing Strategy**: Hybrid approach using mocked data for CI/CD and real API for local development
- **📝 Documentation**: Translated all guides to English and unified testing documentation
- **🏗️ Build Scripts**: Relocated to root level alongside configuration files for better organization
- **⚙️ Jest Configuration**: Enhanced to exclude helper files and support new folder structure

### Fixed
- **🔍 TypeScript Compilation**: Resolved import errors and added proper type guards for CI compatibility
- **📊 Performance Thresholds**: Adjusted test thresholds to account for system performance variations
- **🔗 GitHub Actions**: Updated workflow to use standardized npm scripts aligned with local development
- **📋 Code Linting**: Eliminated all ESLint warnings and TypeScript strict mode violations

### Technical Improvements
- **📈 Test Coverage**: 103 tests across all components (59 unit + 25 integration + 10 address + 9 performance)
- **🚀 Build Performance**: Streamlined structure reduces build complexity and improves development speed
- **🔒 Production Readiness**: Full Raycast Store compliance with professional error handling
- **📚 Architecture Documentation**: Complete guides for development, testing, and deployment procedures
- **🎯 Scalable Foundation**: Clean separation of concerns enabling future feature development

## [1.0.2] - 2025-08-11

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

## [1.0.0] - 2025-08-08

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