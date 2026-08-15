# Authentication Implementation

This document describes the authentication system implemented for the Dodo Payments Raycast plugin.

## Overview

The authentication system uses React Context API to provide a centralized way to manage API keys, environment modes, and authenticated API calls throughout the application.

## Architecture

### 1. Preferences Configuration (`package.json`)

The extension defines two preferences:

- **API Key** (`password` type): Securely stores the user's Dodo Payments API key
- **API Mode** (`dropdown` type): Allows selection between "test" and "live" environments

### 2. Authentication Context (`src/contexts/AuthContext.tsx`)

Provides centralized authentication state management:

```typescript
interface AuthContextType {
  config: AuthConfig | null; // Current auth configuration
  isAuthenticated: boolean; // Authentication status
  isLoading: boolean; // Loading state
  error: string | null; // Error message if any
  refreshAuth: () => void; // Reload authentication
  authenticatedFetch: (endpoint, options) => Promise<Response>; // Pre-configured fetch
}
```

### 3. Authentication Guard (`src/hooks/useAuthGuard.tsx`)

Provides components and hooks for handling authentication UI:

- `useAuthGuard()`: Returns authentication status and guard component
- `withAuthGuard()`: HOC that automatically shows auth error UI when not authenticated

### 4. Authentication Error UI (`src/components/AuthErrorView.tsx`)

User-friendly error screen that:

- Explains the authentication requirement
- Provides step-by-step setup instructions
- Includes a direct link to extension preferences

### 5. Utility Functions (`src/utils/auth.ts`)

Core authentication utilities:

- `validateAuth()`: Validates current authentication configuration
- `getAuthConfig()`: Retrieves current auth configuration
- `getAuthHeaders()`: Generates authorization headers
- `createAuthenticatedFetch()`: Creates pre-configured fetch function

## Usage Patterns

### Basic Usage with Hooks

```typescript
import { useAuth } from "./contexts/AuthContext";

function MyComponent() {
  const { config, authenticatedFetch, isAuthenticated } = useAuth();

  const fetchData = async () => {
    if (!isAuthenticated) return;

    const response = await authenticatedFetch("/api/endpoint");
    const data = await response.json();
    return data;
  };

  return <div>Mode: {config?.mode}</div>;
}
```

### Automatic Authentication Handling

```typescript
import { withAuth, withAuthGuard } from "./contexts/AuthContext";

function MyComponent() {
  // Component logic here
  // Authentication is automatically handled
}

// Export with authentication wrappers
export default withAuth(withAuthGuard(MyComponent));
```

### Manual Authentication Guard

```typescript
import { useAuthGuard } from "./hooks/useAuthGuard";

function MyComponent() {
  const { isReady, AuthGuard } = useAuthGuard();

  return (
    <AuthGuard>
      {/* This content only shows when authenticated */}
      <MyAuthenticatedContent />
    </AuthGuard>
  );
}
```

## Security Features

1. **Secure Storage**: API keys are stored using Raycast's encrypted preferences system
2. **Local Storage**: All authentication data remains on the user's device
3. **Environment Separation**: Clear distinction between test and live environments
4. **Validation**: Comprehensive validation of authentication configuration
5. **Error Handling**: Graceful handling of authentication failures

## API Integration

The system automatically configures API calls with:

- **Base URL**: Automatically selected based on environment mode
  - Test: `https://api-test.dodopayments.com`
  - Live: `https://api.dodopayments.com`
- **Authorization**: Bearer token authentication using the provided API key
- **Headers**: Proper Content-Type and authorization headers

## Error Handling

The system handles various error scenarios:

1. **Missing API Key**: Shows setup instructions
2. **Invalid API Mode**: Validates mode selection
3. **API Failures**: Graceful degradation with mock data for development
4. **Network Issues**: Proper error messaging and retry mechanisms

## Development Workflow

1. **Initial Setup**: User configures API key and mode in preferences
2. **Authentication**: System validates and stores configuration
3. **API Calls**: Components use `authenticatedFetch` for all API requests
4. **Error Handling**: Automatic display of authentication errors when needed
5. **Refresh**: Users can refresh authentication without restarting

## File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Main authentication context
├── hooks/
│   └── useAuthGuard.tsx         # Authentication guard utilities
├── components/
│   ├── AuthErrorView.tsx        # Authentication error UI
│   └── ExampleUsage.tsx         # Usage examples
├── utils/
│   └── auth.ts                  # Core authentication utilities
└── view-payments.tsx            # Example implementation
```

## Benefits

1. **Centralized Management**: Single source of truth for authentication
2. **Reusable Components**: Easy to add authentication to new commands
3. **Type Safety**: Full TypeScript support with proper typing
4. **User Experience**: Clear error messages and setup guidance
5. **Security**: Secure storage and handling of sensitive data
6. **Flexibility**: Support for multiple environments and easy configuration changes
