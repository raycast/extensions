import { getPreferenceValues } from "@raycast/api";

const useAPIKey = () => {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences["apiKey"];
  return apiKey;
};

export default useAPIKey;
