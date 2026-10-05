import { getPreferenceValues } from "@raycast/api";

export type WorkPreferences = {
  workHours: number;
  breakMinutes: number;
};

const DEFAULT_WORK_HOURS = 8;
const DEFAULT_BREAK_MINUTES = 60;

export function resolveWorkPreferences(
  defaultWorkHours: string,
  defaultBreakMinutes: string,
): WorkPreferences {
  const workHours = Number(defaultWorkHours);
  const breakMinutes = Number(defaultBreakMinutes);

  const resolvedWorkHours =
    Number.isFinite(workHours) &&
    workHours > 0 &&
    Number.isInteger(workHours * 60)
      ? workHours
      : DEFAULT_WORK_HOURS;
  const resolvedBreakMinutes =
    Number.isFinite(breakMinutes) &&
    Number.isInteger(breakMinutes) &&
    breakMinutes >= 0
      ? breakMinutes
      : DEFAULT_BREAK_MINUTES;

  if (resolvedWorkHours * 60 + resolvedBreakMinutes >= 24 * 60) {
    return {
      workHours: DEFAULT_WORK_HOURS,
      breakMinutes: DEFAULT_BREAK_MINUTES,
    };
  }

  return {
    workHours: resolvedWorkHours,
    breakMinutes: resolvedBreakMinutes,
  };
}

export function getWorkPreferences(): WorkPreferences {
  const prefs = getPreferenceValues<Preferences>();
  return resolveWorkPreferences(
    prefs.defaultWorkHours,
    prefs.defaultBreakMinutes,
  );
}
