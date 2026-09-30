import { getPreferenceValues } from "@raycast/api";

export enum BatteryTool {
  BCLM = "bclm",
  BATT = "batt",
}

type Preferences = {
  batteryTool: BatteryTool;
  add_system_service: boolean;
  customBCLMPath: string;
  customBattPath: string;
};

export const preferences = getPreferenceValues<Preferences>();
