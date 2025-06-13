# SonarQube Tools Project Structure

This document outlines the structure of the SonarQube Tools Raycast extension codebase.

## Directory Structure

```
src/
├── commands/               # Raycast commands
│   ├── __tests__/          # Command-specific tests
│   ├── README.md           # Commands documentation
│   ├── openSonarQubeApp.tsx
│   ├── runSonarAnalysis.tsx
│   ├── startAnalyzeOpenSonarQube.tsx
│   ├── startSonarQube.tsx
│   └── stopSonarQube.tsx
│
├── components/             # Reusable React components
│   ├── __tests__/          # Component-specific tests
│   ├── ProjectForm/        # Project form component
│   └── README.md           # Components documentation
│
├── hooks/                  # Custom React hooks
│   ├── __tests__/          # Hook-specific tests
│   └── README.md           # Hooks documentation
│
├── i18n/                   # Internationalization utilities
│   ├── __tests__/          # i18n-specific tests
│   ├── translations/       # Translation files
│   └── README.md           # i18n documentation
│
├── services/               # External service integrations
│   └── README.md           # Services documentation
│
├── testUtils/              # Testing utilities
│   ├── factories/          # Test data factories
│   ├── mocks/              # Mock implementations
│   ├── jest.setup.ts       # Jest setup configuration
│   └── testHelpers.ts      # Test helper functions
│
├── types/                  # TypeScript type definitions
│   └── README.md           # Types documentation
│
└── utils/                  # Utility functions
    ├── __tests__/          # Utility-specific tests
    ├── common.ts           # Common utilities
    ├── index.ts            # Re-exports for utilities
    ├── projectManagement.ts # Project management utilities
    ├── sonarQubeStatus.ts  # SonarQube status utilities
    ├── terminal.ts         # Terminal command utilities
    └── README.md           # Utils documentation
```

## Testing Strategy

We follow a consistent testing approach:

1. All testable code has corresponding test files in `__tests__` directories next to the implementation
2. Tests are organized in the same structure as the code they're testing
3. Unit tests are created for individual functions and components
4. Integration tests verify the interaction between multiple components

## Import Conventions

- For importing from specific modules, use relative paths:
  ```tsx
  import { MyComponent } from "../components/MyComponent";
  ```

- For importing utilities, use the index re-export:
  ```tsx
  import { runCommand, isSonarQubeRunning } from "../utils";
  ```

## File Naming Conventions

- React components: PascalCase.tsx
- Utility files: camelCase.ts
- Test files: ModuleName.test.tsx or moduleName.test.ts
- Constants or type files: camelCase.ts

## Documentation

Each major directory contains a README.md file explaining its purpose and contents.
