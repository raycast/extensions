import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  add_system_service: boolean;
  customBCLMPath: string;
};

export const preferences = getPreferenceValues<Preferences>();
