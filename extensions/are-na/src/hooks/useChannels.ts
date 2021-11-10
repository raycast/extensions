import { useCallback } from "react";
import { useAsync } from "react-async";
import { Channels } from "../types/arena";
import { api } from "../util/api";
import { useProfile } from "./useProfile";
import { useToken } from "./useToken";
/**
 * TODO: Add pagination support
 * @returns a paginated array of channels, inside an object describing them
 */
export const useChannels = () => {
  const accessToken = useToken();

  const { data: profile } = useProfile();
  const userId = profile?.id;
  const promiseFn = useCallback(
    userId
      ? async () => api(accessToken)<Channels>("GET", `/users/${userId}/channels`)
      : async () => Promise.resolve(null),
    [accessToken, userId]
  );

  return useAsync<Channels | null>({
    promiseFn,
  });
};
