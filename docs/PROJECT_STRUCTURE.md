# Project Structure

This document outlines the structure of the G-Cloud project to help developers understand the organization and find relevant code.

## Directory Structure

```
g-cloud/
├── src/                  # Source code
│   ├── services/         # Google Cloud service implementations
│   │   ├── iam/          # Identity and Access Management service
│   │   │   ├── components/  # Reusable IAM components
│   │   │   ├── IAMService.ts # IAM service implementation
│   │   │   └── IAMView.tsx   # Main IAM view
│   │   ├── storage/      # Cloud Storage service
│   │   │   ├── components/  # Reusable Storage components
│   │   │   └── ...          # Storage views
│   │   └── ...           # Other services
│   ├── utils/            # Utility functions and helpers
│   ├── views/            # Top-level view components
│   ├── index.tsx         # Main entry point
│   └── gcloud.ts         # Google Cloud CLI wrapper
├── docs/                 # Documentation
├── assets/               # Static assets
└── node_modules/         # Dependencies
```

## Key Files

- `src/index.tsx`: Main entry point for the application
- `src/gcloud.ts`: Wrapper for Google Cloud CLI commands
- `src/utils/`: Reusable utility functions

## Service Structure

Each service is organized in its own directory with a consistent structure:

```
services/[service-name]/
├── components/           # Reusable components for the service
│   ├── index.ts          # Exports all components
│   └── [Component].tsx   # Individual components
├── index.ts              # Exports from the service
├── [Service]Service.ts   # Service implementation
├── [Resource]View.tsx    # Main view component for the resource
└── README.md             # Service-specific documentation
```

### Service Implementation

Service implementation files (`[Service]Service.ts`) contain:

1. Interface definitions for service data structures
2. Service class with methods for interacting with the Google Cloud API
3. Helper functions specific to the service

### View Components

View components (`[Resource]View.tsx`) contain:

1. UI components for displaying and interacting with resources
2. State management for the view
3. Action handlers for user interactions

### Component Structure

Components are organized in a `components` directory within each service:

1. Each component is in its own file
2. Components are exported from an `index.ts` file
3. Components are focused on a single responsibility
4. No component should exceed 200 lines of code

## Utilities

The `src/utils/` directory contains reusable utility functions:

- `FileUtils.ts`: File system operations and helpers
- `raycastShortcuts.ts`: Raycast-specific utilities
- `iamRoles.ts`: IAM role definitions and helpers
- `FilePicker.tsx`: File selection component
- `FileDownloader.tsx`: File download component
- `NativeFilePicker.ts`: Native file system integration
- `CodeEditor.tsx`: Code editing component

## Adding New Services

When adding a new service:

1. Create a new directory in `src/services/`
2. Create a `components` directory for reusable components
3. Implement the service following the established patterns
4. Create view components for the service
5. Export the components from an `index.ts` file
6. Add the service to the main navigation in `src/index.tsx`

## Naming Conventions

- Service classes: `[Service]Service` (e.g., `IAMService`)
- View components: `[Resource]View` (e.g., `IAMView`, `StorageBucketView`)
- Reusable components: Descriptive names (e.g., `IAMPrincipalList`, `CreateBucketForm`)
- Interfaces: Descriptive names matching Google Cloud terminology (e.g., `IAMPolicy`, `Bucket`)
- Utility functions: Camel case, descriptive names (e.g., `formatFileSize`, `executeGcloudCommand`)

## Import Order

Maintain consistent import ordering:

1. React and React hooks
2. External libraries (Raycast, etc.)
3. Node.js built-in modules
4. Local imports (services, utils, etc.)
5. Types and interfaces

## File Size Limits

To maintain code quality and readability:

1. No file should exceed 200 lines of code
2. Break down large components into smaller, focused components
3. Use composition to build complex UIs from simple components
4. Extract reusable logic into custom hooks or utility functions 