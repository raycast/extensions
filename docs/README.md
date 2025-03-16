# G-Cloud Documentation

This directory contains documentation for the G-Cloud project. Use these documents as a reference when developing new features or modifying existing ones.

## Available Documentation

- [Project Structure](PROJECT_STRUCTURE.md) - Overview of the project's directory structure and organization
- [Code Patterns](CODE_PATTERNS.md) - Common code patterns and conventions used throughout the project
- [UI Patterns](UI_PATTERNS.md) - UI component patterns and design guidelines
- [Utils Reference](UTILS_REFERENCE.md) - Reference for utility functions available in the project
- [Caching System](CACHING_SYSTEM.md) - Detailed explanation of the caching system for projects and API calls
- [Shortcuts](SHORTCUTS.md) - Keyboard shortcuts and navigation

## Development Guidelines

When developing new features or modifying existing ones:

1. **Follow established patterns**: Review the code and UI patterns documents to ensure consistency
2. **Reuse existing utilities**: Check the utils reference before implementing new functionality
3. **Maintain project structure**: Follow the project structure guidelines for new services
4. **Update documentation**: Keep these documents up to date as the project evolves
5. **Respect file size limits**: No file should exceed 200 lines of code
6. **Leverage caching**: Use the caching system for performance-critical operations

## Component-Based Architecture

The project follows a component-based architecture:

1. **Break down large components**: Split complex views into smaller, focused components
2. **Organize by feature**: Components are organized in a `components` directory within each service
3. **Maintain clear interfaces**: Define clear props interfaces for all components
4. **Use composition**: Build complex UIs by composing smaller components

## Service Implementation

When implementing a new service:

1. Study the IAM, Storage, and ServiceHub services as reference implementations
2. Follow the same directory structure and code organization
3. Implement consistent UI patterns for resource views
4. Reuse utility functions where appropriate
5. Add appropriate error handling and loading states
6. Break down large components into smaller, reusable pieces
7. Implement caching for expensive API calls

## Key Services

### IAM Service

The Identity and Access Management (IAM) service provides functionality for managing access control in Google Cloud.

### Storage Service

The Cloud Storage service provides functionality for managing storage buckets and objects.

### ServiceHub

The ServiceHub service provides functionality for managing Google Cloud service activation and API enablement. It allows users to:

- View all available Google Cloud services
- Enable and disable services
- View service details and dependencies
- Filter services by category and status

## Utilities

The project includes several utility modules to avoid code duplication:

- `iamRoles.ts`: Provides information about IAM roles without needing to fetch from the API
- `gcpServices.ts`: Contains comprehensive information about Google Cloud services and APIs
- `FileUtils.ts`: Handles file system operations
- `CacheManager.ts`: Manages caching of projects and API responses
- Other utilities for UI components and Raycast integration

## Code Style

- Use TypeScript for all new code
- Follow the existing import order conventions
- Document interfaces and complex functions with JSDoc comments
- Use consistent naming conventions for components, services, and functions
- Keep files under 200 lines of code

## Performance Considerations

- Implement caching for expensive API calls
- Use memoization for computed values
- Optimize rendering of large lists
- Show appropriate loading indicators for async operations
- Leverage the project caching system for frequently accessed resources 