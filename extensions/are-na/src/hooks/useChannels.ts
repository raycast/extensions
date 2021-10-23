import { useMemo } from "react";
import { useAsync } from "react-async";
import { Channels } from "../types/arena";
import { api } from "../util/api";
/**
 * TODO: Add pagination support
 * @param accessToken the are.na access token, saved from preferences
 * @param userId can be provided from the user's profile
 * @returns a paginated array of channels, inside an object describing them
 */
export const useChannels = (accessToken: string, userId?: number) => {
  const fetch = useMemo(
    () => (userId ? () => api(accessToken)("GET", `/users/${userId}/channels`) as Promise<Channels> : async () => null),
    [accessToken, userId]
  );
  return useAsync<Channels | null>({
    promiseFn: fetch,
  });
};
