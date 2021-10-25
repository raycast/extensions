import { getPreferenceValues } from '@raycast/api';

export interface Preference {
  type: 'feishu' | 'lark';
  subdomain: string;
  spaceSession: string;
  recentListCount: number;
}

export function getPreference(): Preference {
  const preference = getPreferenceValues<Preference>();
  preference.recentListCount = Number(preference.recentListCount) || 15;
  return preference;
}
