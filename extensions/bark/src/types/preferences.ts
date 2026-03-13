import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  deviceToken: string;
  autoGetMessage: boolean;
  autoCloseWindow: boolean;
};
export const { deviceToken, autoGetMessage, autoCloseWindow } = getPreferenceValues<Preferences>();
