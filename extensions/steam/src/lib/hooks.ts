import { getPreferenceValues } from "@raycast/api";

export const useIsLoggedIn = () => {
  const { token, steamid } = getPreferenceValues();
  return token && steamid;
};
