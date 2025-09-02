# BRREG Search Changelog

## [Version 2.0.3 – Updated README] - {PR_MERGE_DATE}
- Nothing big, just an absent-minded dev

## [Version 2.0.2 – New keyboard shortcuts for financial data] - 2025-08-25
- Added keyboard shortcuts for copying revenue (⌘⇧R) and net result (⌘⇧N)
- Refactored all keyboard shortcuts to use centralized constants for better maintainability

## [Version 2.0.1 – Minor updates and typography fixes] - 2025-08-25
- Updated Welcome message
- Added Keyboard Shortcuts to the Welcome screen and made it available from all views
- Companies can now be added (⌘F) or removed (⌘⇧F) from Favorites, including from the Detail view
- Favorites are hidden while typing; only search results show once you start typing
- Added a visual metadata tag indicating whether a company is in the Favorites list or not
- Simplified Favorites empty state copy
- Added link to GitHub for feedback and feature requests
- Removed uncessecary settings view
- Fixed some links not working as intended

## [Version 2.0.0 - Major Refactoring & Enhancement Release] - 2025-08-19
🚀 **What's New?**

### ✨ **Enhanced User Experience**
- **Welcome Messages**: Helpful onboarding for new users with no favorites
- **User Settings**: Customizable preferences including welcome message display and performance monitoring
- **Keyboard Shortcuts Help**: Comprehensive guide accessible from the welcome section
- **Improved Empty States**: Better guidance when no favorites or search results exist

### 🏗️ **Architecture Improvements**
- **Component Extraction**: Broke down monolithic component into focused, reusable pieces
- **Custom Hooks**: Extracted business logic into specialized hooks for better maintainability
- **Zero Code Duplication**: Eliminated all redundant action code with shared components
- **Performance Optimization**: React.memo implementation and optimized data structures

### 🎨 **New Components**
- **EntityActions**: Common actions for all entities (view, copy, open in browser)
- **FavoriteActions**: Specialized actions for favorites (emoji, reorder, remove)
- **SearchResultActions**: Conditional actions for search results
- **SettingsView**: User preferences management interface
- **KeyboardShortcutsHelp**: Comprehensive shortcuts reference
- **ErrorBoundary**: Robust error handling with graceful fallbacks

### 🔧 **Technical Enhancements**
- **Type Safety**: 100% TypeScript coverage with strict typing
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Performance Monitoring**: Development tools for component performance tracking
- **Constants Management**: Centralized configuration for easy maintenance
- **Dependency Cleanup**: Removed unused Google Static Maps API key requirement

## [Version 1.1.0 - Initial Enhancement Release] – 2025-08-19

♻️ **What's Changed:**
- Corrected the English name of Brønnøysundregistrene to the official translation (The Brønnøysund Register Centre).

⭐ **What's New:**
- Favorite entities to keep your most-used companies and organisations at your fingertips
- Basic search functionality for Norwegian companies
- Company details view with financial information
- Map integration for company locations

## [Version 1.0.0 - Initial Release] - 2025-02-25

🎯 **Core Features:**
- Search Norwegian companies by name or organization number
- View company details and financial information
- Copy company data to clipboard
- Open companies in Brønnøysundregistrene website

Made with 🫶 by [kynd](https://www.kynd.no) 
