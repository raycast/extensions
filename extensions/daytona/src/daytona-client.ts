import { Daytona, DaytonaError } from "@daytona/sdk";
import { getDaytonaClientOptions, getDaytonaPreferences } from "./daytona-preferences";

export function createDaytonaClient(preferences?: Preferences): Daytona {
  const prefs = preferences ?? getDaytonaPreferences();
  return new Daytona(getDaytonaClientOptions(prefs));
}

export function getDaytonaErrorMessage(error: unknown): string {
  return error instanceof DaytonaError || error instanceof Error ? error.message : String(error);
}
