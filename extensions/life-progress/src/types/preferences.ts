import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  showDailyWord: boolean;
  showProgressBar: boolean;
  countdownDateFirst: boolean;
  birthdayEveryDay: boolean;
  commandMetadata: string;
  birthday: string;
  weekStart: string;
  iconTheme: string;
  progressSymbol: string;
}

export const { weekStart, birthdayEveryDay, commandMetadata, birthday, iconTheme, progressSymbol } =
  getPreferenceValues<Preferences>();
