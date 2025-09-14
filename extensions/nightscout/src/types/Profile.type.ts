export interface ProfileTimeValue {
  time: string;
  value: number;
  timeAsSeconds?: number;
}

export interface ProfileData {
  dia: number;
  carbratio: ProfileTimeValue[];
  carbs_hr: number;
  delay: number;
  sens: ProfileTimeValue[];
  timezone: string;
  basal: ProfileTimeValue[];
  target_low: ProfileTimeValue[];
  target_high: ProfileTimeValue[];
  startDate: string;
  units: "mg/dl" | "mmol";
}

export interface ProfileStore {
  [profileName: string]: ProfileData;
}

export interface ProfileResponse {
  _id: string;
  defaultProfile: string;
  store: ProfileStore;
  startDate: string;
  mills: number;
  created_at: string;
  srvModified: number;
  units: "mg/dl" | "mmol";
}

export interface ActiveProfile {
  name: string;
  data: ProfileData;
  isDefault: boolean;
  validFrom?: number;
  validUntil?: number;
}

export interface ProfileTargets {
  low: number;
  high: number;
  profileName: string;
  isDefault: boolean;
}

/**
 * Helper to get target values for a specific time within a profile
 */
export function getTargetsAtTime(profile: ProfileData, timeInDay: number): { low: number; high: number } {
  const getValueAtTime = (timeValues: ProfileTimeValue[], time: number): number => {
    // convert time to seconds since midnight
    const timeSeconds = (time % (24 * 60 * 60 * 1000)) / 1000;

    // find the appropriate value for this time
    let currentValue = timeValues[0]?.value || 0;

    for (const entry of timeValues) {
      const entrySeconds = entry.timeAsSeconds ?? parseTimeToSeconds(entry.time);
      if (entrySeconds <= timeSeconds) {
        currentValue = entry.value;
      } else {
        break;
      }
    }

    return currentValue;
  };

  return {
    low: getValueAtTime(profile.target_low, timeInDay),
    high: getValueAtTime(profile.target_high, timeInDay),
  };
}

/**
 * Parse time string (HH:MM) to seconds since midnight
 */
export function parseTimeToSeconds(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 3600 + minutes * 60;
}
