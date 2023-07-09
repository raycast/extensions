import { getPreferenceValues } from "@raycast/api";
import { AppPreferences } from "../schema";

export const useToken = () => {
  const { api_token } = getPreferenceValues<AppPreferences>();
  return api_token;
};

export default useToken;
