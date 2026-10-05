import React, { createContext, useContext, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getPreferenceValues } from "@raycast/api";
import { Preferences, AuthConfig, validateAuth } from "../utils/auth";
import { DodoPaymentsAPI, createAPIClient, DodoPayments } from "../api";

interface AuthContextType {
  config: AuthConfig | null;
  apiClient: DodoPaymentsAPI | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  refreshAuth: () => void;
  authenticatedFetch: (endpoint: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function AuthProvider({ children }: AuthProviderProps) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [apiClient, setApiClient] = useState<DodoPaymentsAPI | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuthConfig = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const validation = validateAuth();

      if (!validation.isValid) {
        setError(validation.error || "Authentication failed");
        setIsAuthenticated(false);
        setConfig(null);
        setApiClient(null);
        setIsLoading(false);
        return;
      }

      const preferences = getPreferenceValues<Preferences>();
      const baseUrl =
        preferences.apiMode === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";

      const authConfig: AuthConfig = {
        apiKey: preferences.apiKey,
        baseUrl,
        mode: preferences.apiMode,
      };

      // Create API client
      const client = createAPIClient(authConfig);

      // Test authentication by fetching brands (minimal request)
      try {
        await client.listBrands();
        // If we get here, the API key is valid (status 200)
      } catch (error) {
        // Check if it's an authentication error (status 401)
        if (error instanceof DodoPayments.APIError && error.status === 401) {
          setError("Invalid API key. Please check your authentication settings.");
          setIsAuthenticated(false);
          setConfig(null);
          setApiClient(null);
          setIsLoading(false);
          return;
        } else if (error instanceof Error && error.message.includes("Invalid API key")) {
          setError("Invalid API key. Please check your authentication settings.");
          setIsAuthenticated(false);
          setConfig(null);
          setApiClient(null);
          setIsLoading(false);
          return;
        }
        // For other errors, still proceed but log the error
        console.warn("Non-auth error during API key validation:", error);
      }

      setConfig(authConfig);
      setApiClient(client);
      setIsAuthenticated(true);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load authentication configuration";
      setError(errorMessage);
      setIsAuthenticated(false);
      setConfig(null);
      setApiClient(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = () => {
    loadAuthConfig();
  };

  const authenticatedFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
    if (!config) {
      throw new Error("Authentication not configured");
    }

    const url = `${config.baseUrl}${endpoint}`;

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    return fetch(url, requestOptions);
  };

  useEffect(() => {
    loadAuthConfig();
  }, []);

  const contextValue: AuthContextType = {
    config,
    apiClient,
    isAuthenticated,
    isLoading,
    error,
    refreshAuth,
    authenticatedFetch,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Higher-order component to wrap commands with authentication
export function withAuth<T extends object>(Component: React.ComponentType<T>): React.ComponentType<T> {
  return function AuthenticatedComponent(props: T) {
    return (
      <AuthProvider>
        <Component {...props} />
      </AuthProvider>
    );
  };
}
