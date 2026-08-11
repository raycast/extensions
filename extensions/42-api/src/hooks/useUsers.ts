/**
 * Hook for searching 42 users
 */

import { useMemo } from "react";
import { useFetch } from "@raycast/utils";
import { useAuth } from "./useAuth";
import { User } from "../lib/types";
import { API_BASE_URL } from "../lib/constants";

export type SearchMode = "login" | "first_name" | "last_name";

export interface UseUsersOptions {
  /** Execute the fetch only when this is true */
  execute?: boolean;
  /** Suppress error toasts (useful for background mode) */
  suppressToasts?: boolean;
  /** Number of results per page */
  perPage?: number;
  /** Search mode: login (prefix), first_name (exact), or last_name (exact) */
  searchMode?: SearchMode;
}

export interface UseUsersReturn {
  users: User[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  authenticate: () => Promise<void>;
}

export function useUsers(searchQuery: string, options: UseUsersOptions = {}): UseUsersReturn {
  const { execute = true, suppressToasts = false, perPage = 30, searchMode = "login" } = options;
  const { accessToken, isAuthenticating, authenticate } = useAuth();

  const url = useMemo(() => {
    if (!accessToken || isAuthenticating || !searchQuery.trim()) return API_BASE_URL;

    const baseUrl = `${API_BASE_URL}/users`;
    const params = new URLSearchParams();

    if (searchMode === "login") {
      // Use range-based prefix search for login
      // To search for logins starting with a prefix, use range[login]=prefix,prefixz
      // This returns all logins that fall alphabetically between "prefix" and "prefixz"
      const prefix = searchQuery.toLowerCase();
      params.append("range[login]", `${prefix},${prefix}z`);
    } else if (searchMode === "first_name") {
      // Use exact filter matching for first name
      params.append("filter[first_name]", searchQuery);
    } else if (searchMode === "last_name") {
      // Use exact filter matching for last name
      params.append("filter[last_name]", searchQuery);
    }

    params.append("page[size]", perPage.toString());

    return `${baseUrl}?${params.toString()}`;
  }, [searchQuery, accessToken, isAuthenticating, perPage, searchMode]);

  const {
    data: users,
    isLoading,
    error,
    revalidate,
  } = useFetch<User[]>(url, {
    headers: {
      Authorization: `Bearer ${accessToken || ""}`,
      "Content-Type": "application/json",
    },
    execute: execute && !!searchQuery.trim() && !!accessToken && !isAuthenticating,
    keepPreviousData: false,
    failureToastOptions: suppressToasts
      ? { title: "" }
      : {
          title: "Failed to search users",
          message: `Could not search for "${searchQuery}"`,
        },
  });

  return {
    users,
    isLoading: isLoading || isAuthenticating,
    error,
    revalidate,
    isAuthenticated: !!accessToken,
    isAuthenticating,
    authenticate,
  };
}
