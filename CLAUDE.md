# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for managing Google Cloud resources. It's built with TypeScript and React, providing a native macOS interface to GCP services without needing to open a browser.

## Essential Commands

```bash
# Development
npm run dev        # Start development mode with hot reload

# Code Quality
npm run lint       # Check for linting errors
npm run fix-lint   # Auto-fix linting errors

# Build
npm run build      # Build the extension for production

# Publishing
npm run publish    # Publish to Raycast store
```

## Architecture Overview

### Service-Based Structure
The codebase follows a service-oriented architecture where each Google Cloud service has its own module:

- **Entry Points**: Each service has a command file at the root (`compute.tsx`, `iam.tsx`, `network.tsx`, `storage.tsx`)
- **Service Layer**: Implementation details in `src/services/[service-name]/`
- **Shared Components**: Reusable UI components in `src/views/`
- **Utilities**: Common functionality in `src/utils/`

### Key Architectural Patterns

1. **Caching Strategy**: The `CacheManager` (src/utils/CacheManager.ts) implements intelligent caching to reduce API calls and improve performance.

2. **Service Classes**: Each GCP service has a dedicated service class that:
   - Executes `gcloud` CLI commands
   - Parses responses
   - Handles errors with retry logic
   - Manages caching

3. **Command Pattern**: Each Raycast command is a separate entry point that:
   - Initializes the appropriate service
   - Renders the main list view
   - Handles user interactions

4. **Error Handling**: Consistent error handling across services with:
   - Retry mechanisms for transient failures
   - User-friendly error messages
   - Authentication flow when needed

### Important Implementation Details

- **gcloud Dependency**: The extension requires Google Cloud SDK to be installed and relies on the `gcloud` CLI for all operations
- **Authentication**: Uses the system's gcloud authentication state
- **Project Context**: Manages GCP project context through preferences and QuickSwitcher functionality
- **React Hooks**: Uses Raycast's custom hooks for data fetching and state management

### Adding New Features

When adding new GCP service support:
1. Create a new command file at the root (e.g., `newservice.tsx`)
2. Add service implementation in `src/services/newservice/`
3. Follow the existing service structure for consistency
4. Update package.json with the new command
5. Implement caching where appropriate

### Testing Approach

- Manual testing through Raycast development mode
- Focus on error scenarios and edge cases
- Test with different GCP project configurations
- Verify caching behavior

## Developer Best Practices

- Always run `ray lint --fix` after implementing a change