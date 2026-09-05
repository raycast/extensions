import { getPreferenceValues } from "@raycast/api";

/**
 * Extension preferences. Raycast also auto-generates a global `Preferences`
 * interface into `raycast-env.d.ts` on build; this local declaration keeps the
 * code type-checkable before that file exists and cannot clash with the global.
 */
export interface Preferences {
  apiKey: string;
}

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}
