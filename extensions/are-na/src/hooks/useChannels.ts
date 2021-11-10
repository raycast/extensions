import { Channels } from "../types/arena";
import { useQuery } from "react-query";
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
  const path = userId ? (`/users/${userId}/channels` as const) : (`null` as const);
  return useQuery<Channels>(path, () => api(accessToken)<Channels>("GET", path), {
    enabled: !!userId,
  });
};
