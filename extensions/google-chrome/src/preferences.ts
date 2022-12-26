import path from "path";
import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  userDataPath: string;
  profileName: string;
}

export const getProfilePath = (): string => {
  const { userDataPath, profileName } = getPreferenceValues<Preferences>();
  return path.join(userDataPath, profileName);
};
