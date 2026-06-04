/**
 * Hook for fetching multiple specific users by their logins
 */

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "./useAuth";
import { User } from "../lib/types";
import { API_BASE_URL } from "../lib/constants";

export interface UsePinnedUsersOptions {
  /** Execute the fetch only when this is true */
  execute?: boolean;
}

export interface UsePinnedUsersReturn {
  users: User[];
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
}

export function usePinnedUsers(logins: string[], options: UsePinnedUsersOptions = {}): UsePinnedUsersReturn {
  const { execute = true } = options;
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  // Memoize the joined logins string to prevent unnecessary re-renders
  const loginsKey = useMemo(() => logins.join(","), [logins.join(",")]);

  async function fetchUsers() {
    if (!accessToken || logins.length === 0 || !execute) {
      setUsers([]);
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      // Fetch each user individually
      const promises = logins.map(async (login) => {
        const response = await fetch(`${API_BASE_URL}/users/${login}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch user ${login}: ${response.statusText}`);
        }

        return response.json();
      });

      const fetchedUsers = await Promise.all(promises);
      setUsers(fetchedUsers);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch pinned users"));
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [loginsKey, accessToken, execute]);

  return {
    users,
    isLoading,
    error,
    revalidate: fetchUsers,
  };
}
