import { getPreferenceValues } from "@raycast/api";

export type WorkPreferences = {
  workHours: number;
  breakMinutes: number;
};

export function getWorkPreferences(): WorkPreferences {
  const prefs = getPreferenceValues<Preferences.CalculateLeaveTime>();
  const workHours = parseFloat(prefs.defaultWorkHours);
  const breakMinutes = parseInt(prefs.defaultBreakMinutes, 10);
  return {
    workHours: Number.isNaN(workHours) ? 8 : workHours,
    breakMinutes: Number.isNaN(breakMinutes) ? 60 : breakMinutes,
  };
}
