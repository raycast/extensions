import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  showDailyWord: boolean;
  showProgressBar: boolean;
  countdownDateFirst: boolean;
  birthdayEveryDay: boolean;
  birthday: string;
  weekStart: string;
  iconTheme: string;
  progressSymbol: string;
}

export const { weekStart, birthdayEveryDay, birthday, iconTheme, progressSymbol } = getPreferenceValues<Preferences>();
