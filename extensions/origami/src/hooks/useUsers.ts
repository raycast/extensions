import { useCachedPromise } from "@raycast/utils";
import { getUsers } from "../services/instanceService";

/**
 * Hook for fetching users from the Origami system
 *
 * @returns The users data, loading state, and error
 */
export function useUsers() {
  return useCachedPromise(getUsers, []);
}
