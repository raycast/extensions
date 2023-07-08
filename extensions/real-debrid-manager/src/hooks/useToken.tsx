import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  api_token: string;
};

export const useToken = () => {
  const { api_token } = getPreferenceValues<Preferences>();
  return api_token;
};

export default useToken;
