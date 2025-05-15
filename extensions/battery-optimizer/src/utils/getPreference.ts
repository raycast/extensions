import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  batteryTool: "bclm" | "batt";
  add_system_service: boolean;
  customBCLMPath: string;
  customBattPath: string;
};

export const preferences = getPreferenceValues<Preferences>();
