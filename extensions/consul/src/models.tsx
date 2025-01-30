import { getPreferenceValues } from "@raycast/api";

interface ConsulPrefrences {
  consulRepositoryPath: string;
}

export const usePreferences = () => {
  return getPreferenceValues<ConsulPrefrences>();
};

export interface KeySearchResult {
  key: string;
  fullPathToJSON: string;
  environment: string;
  region: string; // TODO: change region to a type
  content: string;
}
