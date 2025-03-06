import { Preferences } from "@/types/preference";
import { getPreferenceValues } from "@raycast/api";

export const getNodes = () => {
  const { nodes } = getPreferenceValues<Preferences>();
  return nodes.split(" ");
};
export const getToken = () => {
  const { token } = getPreferenceValues<Preferences>();
  return token;
};
