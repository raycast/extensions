/**
 * Hook for fetching 42 user data
 */

import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import { useAuth } from "./useAuth";
import { User } from "../lib/types";
import { API_BASE_URL } from "../lib/constants";

export interface UseUserOptions {
  /** Execute the fetch only when this is true */
  execute?: boolean;
  /** Suppress error toasts (useful for background mode) */
  suppressToasts?: boolean;
}

export interface UseUserReturn {
  user: User | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authenticate: () => Promise<void>;
}

export function useUser(login: string, options: UseUserOptions = {}): UseUserReturn {
  const { execute = true, suppressToasts = false } = options;
  const { accessToken, isAuthenticating, authenticate } = useAuth();

  const url = useMemo(() => {
    if (!login || !accessToken || isAuthenticating) return "";
    return `${API_BASE_URL}/users/${login}`;
  }, [login, accessToken, isAuthenticating]);

  const {
    data: user,
    isLoading,
    error,
    revalidate,
  } = useFetch<User>(url, {
    headers: {
      Authorization: `Bearer ${accessToken || ""}`,
      "Content-Type": "application/json",
    },
    execute: execute && !!url,
    keepPreviousData: false,
    failureToastOptions: suppressToasts ? { title: "" } : undefined,
  });

  return {
    user,
    isLoading: isLoading || isAuthenticating,
    error,
    revalidate,
    isAuthenticated: !!accessToken,
    isAuthenticating,
    authenticate,
  };
}
