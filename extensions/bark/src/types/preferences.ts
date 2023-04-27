import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  deviceToken: string;
  autoGetMessage: boolean;
};
export const { deviceToken, autoGetMessage } = getPreferenceValues<Preferences>();
