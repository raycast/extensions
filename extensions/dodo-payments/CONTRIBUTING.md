# Contributing to Dodo Payments Raycast Extension

Thank you for your interest in contributing to the Dodo Payments Raycast extension! This guide will help you understand the codebase structure and development practices.

## Development Setup

1. Clone the repository
2. Navigate to the plugin directory: `cd plugins/raycast-plugin`
3. Install dependencies: `npm install`
4. Start development: `npm run dev`

## Architecture

The extension is built with modern React patterns and follows Raycast's best practices:

- **React Query**: Used for efficient data fetching, caching, and infinite scrolling
- **TypeScript**: Full type safety with Dodo Payments API types
- **Context API**: Clean authentication state management
- **Custom Hooks**: Reusable logic for data fetching and authentication

## Authentication Context

The extension uses React Context API for authentication management. This provides a clean way to access authentication state and make API calls throughout the application.

### Using the Authentication Context

```typescript
import { useAuth } from "./contexts/AuthContext";

function MyComponent() {
  const {
    config,           // Current auth configuration
    isAuthenticated,  // Boolean auth status
    isLoading,        // Loading state
    error,            // Error message if any
    authenticatedFetch, // Pre-configured fetch function
    refreshAuth       // Function to reload auth
  } = useAuth();

  const fetchData = async () => {
    try {
      const response = await authenticatedFetch("/api/endpoint");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API call failed:", error);
    }
  };

  return <div>Current mode: {config?.mode}</div>;
}
```

### Higher-Order Components

For automatic authentication handling, use the provided HOCs:

```typescript
import { withAuth, withAuthGuard } from "./contexts/AuthContext";

function MyComponent() {
  // Your component logic here
  // Authentication is automatically handled
}

// Export with authentication wrappers
export default withAuth(withAuthGuard(MyComponent));
```

### Authentication Flow

1. **withAuth**: Provides the AuthContext to the component tree
2. **withAuthGuard**: Automatically shows auth error UI if not authenticated
3. **useAuth**: Hook to access authentication state and methods

## Data Fetching

The extension uses React Query for efficient data management:

- **Infinite Queries**: All list views support infinite scrolling for performance
- **Caching**: Intelligent caching reduces API calls and improves responsiveness
- **Error Handling**: Graceful error handling with user-friendly messages
- **Loading States**: Proper loading indicators for better UX

## File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx         # Main authentication context
├── hooks/
│   ├── useAuthGuard.tsx        # Authentication guard hook
│   └── useQueries.tsx          # React Query hooks for data fetching
├── components/
│   └── AuthErrorView.tsx       # Error UI component
├── utils/
│   ├── auth.ts                 # Authentication utilities
│   └── formatting.ts           # Data formatting utilities
├── view-payments.tsx           # Payments command
├── view-subscriptions.tsx      # Subscriptions command
├── view-customers.tsx          # Customers command
├── view-products.tsx           # Products command
├── view-discounts.tsx          # Discount codes command
├── view-license-keys.tsx       # License keys command
├── view-disputes.tsx           # Disputes command
├── view-refunds.tsx            # Refunds command
└── view-payouts.tsx            # Payouts command
```

## Development Guidelines

When adding new features:

1. **Follow Existing Patterns**: Use the established patterns for authentication and data fetching
2. **Type Safety**: Use TypeScript types from the `dodopayments` package
3. **Error Handling**: Implement proper error handling and loading states
4. **User Experience**: Add appropriate copy actions for user convenience
5. **Consistency**: Use consistent formatting utilities for data display
6. **Performance**: Implement infinite scrolling for large data sets
7. **Testing**: Test both test and live API modes

## Code Style

- Use TypeScript for all new code
- Follow the existing ESLint configuration
- Use Prettier for code formatting
- Write descriptive commit messages
- Keep components focused and reusable

## Adding New Commands

To add a new command:

1. Create a new file in `src/` following the naming pattern `view-{resource}.tsx`
2. Implement the component using the authentication HOCs
3. Add the command to `package.json` in the `commands` array
4. Create appropriate hooks in `useQueries.tsx` if needed
5. Add proper TypeScript types
6. Test with both test and live API modes

## API Integration

- All API calls should use the `authenticatedFetch` function from the auth context
- Use React Query for data fetching and caching
- Handle API errors gracefully with user-friendly messages
- Implement proper loading states
- Support infinite scrolling for list views

## Testing

- Test all commands with both test and live API keys
- Verify authentication error handling
- Test search functionality
- Verify copy actions work correctly
- Test infinite scrolling behavior

## Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes following the guidelines above
4. Test thoroughly
5. Submit a pull request with a clear description

## Resources

- [Raycast API Documentation](https://developers.raycast.com/)
- [Dodo Payments API Documentation](https://docs.dodopayments.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
