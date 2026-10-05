import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { AuthErrorView } from "../components/AuthErrorView";

interface UseAuthGuardResult {
  isReady: boolean;
  AuthGuard: React.ComponentType<{ children: React.ReactNode }>;
}

/**
 * Hook that provides authentication guard functionality
 * Returns a component that either shows auth error or renders children
 */
export function useAuthGuard(): UseAuthGuardResult {
  const { isAuthenticated, isLoading, error } = useAuth();

  const AuthGuard: React.ComponentType<{ children: React.ReactNode }> = ({ children }) => {
    if (isLoading) {
      // Return null or a loading component - Raycast will show its own loading state
      return null;
    }

    if (!isAuthenticated || error) {
      return <AuthErrorView error={error || "Authentication required"} />;
    }

    return <>{children}</>;
  };

  return {
    isReady: isAuthenticated && !isLoading && !error,
    AuthGuard,
  };
}

/**
 * Higher-order component that automatically handles authentication
 * Shows auth error if not authenticated, otherwise renders the wrapped component
 */
export function withAuthGuard<T extends object>(Component: React.ComponentType<T>): React.ComponentType<T> {
  return function GuardedComponent(props: T) {
    const { AuthGuard } = useAuthGuard();

    return (
      <AuthGuard>
        <Component {...props} />
      </AuthGuard>
    );
  };
}
