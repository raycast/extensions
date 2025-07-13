# Changelog

All notable changes to the Pipedream Workflow Manager extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - {PR_MERGE_DATE}

### Major Refactor & Improvements

- **Codebase cleanup:** Removed unused code, types, and utilities for a leaner, more maintainable extension.
- **Improved maintainability:** All types, utilities, and components are now lean and only include what is actually used.
- **UI/UX improvements:**
  - Renamed "View Recent Errors" to "View Workflow Details" for clarity.
  - AI Error Summary is now only shown when there are actual errors.
  - All actions and Command-K palette entries use clear, user-friendly names.
- **Raycast best practices:**
  - All commands, metadata, and preferences reviewed and updated for Raycast Store requirements.
  - No unused components, hooks, or assets remain.
  - All assets and icons are properly referenced.
- **Performance & accessibility:**
  - Improved conditional rendering and reduced unnecessary logic.
  - Ensured all UI elements are accessible and performant.
- **Ready for Raycast Store review and publishing.**

---

## [1.6.0] - {PR_MERGE_DATE}

### 🤖 AI-Powered Error Analysis

- **AI Error Summary**: Revolutionary AI-powered error analysis that provides intelligent insights into workflow issues
- **Smart Error Categorization**: AI automatically categorizes and analyzes error patterns from up to 100 recent errors
- **Actionable Recommendations**: AI generates specific, actionable recommendations based on actual error data
- **Data-Driven Insights**: AI analysis is purely based on provided error logs without external assumptions
- **Enhanced Prompting**: Optimized AI prompts for concise, well-structured summaries with clear markdown formatting

### 🎯 Enhanced User Experience

- **Dedicated AI Summary View**: Beautiful, dedicated page for AI analysis with markdown support
- **Copy & Regenerate Actions**: Easy copy-to-clipboard and regenerate functionality for AI summaries
- **Raw Logs View**: Direct access to view raw error logs for detailed investigation
- **Smart Link Generation**: Automatically adds relevant Pipedream documentation links based on error types

### 🔧 Technical Improvements

- **AI Integration**: Seamless integration with Raycast AI for intelligent error analysis
- **Enhanced Error Handling**: Comprehensive error handling for AI generation with user-friendly feedback
- **Performance Optimization**: Efficient processing of large error datasets for AI analysis

## [1.5.0] - {PR_MERGE_DATE}

### 🎯 Enhanced User Experience

- **Improved Menu Bar**: Enhanced menu bar with better error handling, loading states, and auto-refresh
- **Copy Workflow URL**: Added "Copy Workflow URL" functionality throughout the app
- **Better Error Handling**: Robust error handling with user-friendly toast notifications
- **Auto-refresh**: Menu bar automatically refreshes every 5 minutes for real-time updates
- **Enhanced Analytics**: Improved analytics view with error categorization and severity assessment

### 🔧 Technical Improvements

- **Type Safety**: Enhanced TypeScript types for better error handling
- **Performance**: Optimized API calls with parallel processing for better performance
- **Error Recovery**: Graceful handling of API failures with fallback mechanisms

### 📱 UI/UX Enhancements

- **Loading States**: Better loading indicators throughout the application
- **Toast Notifications**: User-friendly success and error notifications
- **Icon Consistency**: Updated icons for better visual consistency
- **Navigation**: Improved navigation between different views
- **Error Display**: Enhanced error display with severity indicators and timestamps

### 🛠️ Developer Experience

- **Enhanced Types**: Comprehensive type definitions for all features
- **Better Code Organization**: Improved code structure and maintainability

## [1.4.1] - {PR_MERGE_DATE}

### Improvements

- **Quick Actions Enhancements**:
  - Added "Copy Workflow URL" as a quick action in the analytics view.
  - Added "Go to workflow management" quick action in the analytics view.
- **UI/UX Tweaks**: Minor improvements to tooltips, action labels, and overall interface consistency.

## [1.4.0] - {PR_MERGE_DATE}

### New Features

- **Enhanced Export**: Improved workflow export functionality with better error handling
- **Workflow Management**: Streamlined workflow management with better organization
- **Error Analytics**: Enhanced error tracking and analytics capabilities

### Improvements

- **UI/UX**: Better user interface with improved navigation and feedback
- **Performance**: Optimized API calls and data processing
- **Error Handling**: More robust error handling throughout the application

## [1.3.1] - {PR_MERGE_DATE}

### Bug Fixes

- **Build Issues**: Fixed import/export issues that were causing build failures
- **Type Errors**: Resolved TypeScript compilation errors

## [1.3.0] - {PR_MERGE_DATE}

### New Features

- **Enhanced Error Management**: Improved error categorization, severity assessment, and resolution tracking
- **Advanced Analytics**: Enhanced analytics with performance metrics and error statistics
- **Improved Workflow Management**: Better workflow organization and management capabilities
- **Enhanced Export/Import**: Improved export functionality with better data handling
- **UI/UX Improvements**: Better user interface with improved navigation and feedback

### Technical Improvements

- **Type Safety**: Enhanced TypeScript types for better development experience
- **Error Handling**: More robust error handling throughout the application
- **Performance**: Optimized API calls and data processing

## [1.2.1] - {PR_MERGE_DATE}

### Bug Fixes

- **Build Error**: Fixed missing export for workflow-analytics command
- **TypeScript**: Resolved compilation issues

## [1.2.0] - {PR_MERGE_DATE}

### New Features

- **Reusable WorkflowList Component**: Consistent workflow display across all views with sorting, filtering, and folder structure
- **Enhanced Analytics**: Improved analytics view with clear sections and individual error items
- **Better Navigation**: Improved navigation between different views
- **Error Count Display**: Enhanced error count display with accurate counting logic

### UI/UX Improvements

- **Consistent Design**: Unified design language across all views
- **Better Organization**: Improved workflow organization and display
- **Enhanced Feedback**: Better user feedback and error handling

### Technical Improvements

- **Code Reusability**: Shared components for better maintainability
- **Type Safety**: Enhanced TypeScript types
- **Performance**: Optimized rendering and data processing

## [1.1.0] - {PR_MERGE_DATE}

### New Features

- **Workflow Analytics**: View detailed analytics for individual workflows including error statistics and performance metrics
- **Error Categorization**: Automatic categorization of workflow errors by type and severity
- **Export Functionality**: Export workflow configurations as JSON
- **Enhanced Error Management**: Better error tracking and resolution capabilities

### Improvements

- **UI/UX**: Improved user interface with better navigation and feedback
- **Error Handling**: More robust error handling throughout the application
- **Performance**: Optimized API calls and data processing

## [1.0.0] - {PR_MERGE_DATE}

### Initial Release

- **Workflow Management**: Connect, view, and manage Pipedream workflows
- **Menu Bar Integration**: Quick access to workflows from the menu bar
- **Error Tracking**: Monitor workflow errors and performance
- **Basic Analytics**: View workflow statistics and error counts
