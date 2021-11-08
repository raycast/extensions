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

export const preference = getPreference();

export const TYPE_TLD = preference.type === 'feishu' ? 'feishu.cn' : 'larksuite.com';

export const API_DOMAIN = `https://${preference.subdomain}.${TYPE_TLD}`;

export const INTERNAL_API_DOMAIN = `https://internal-api-space.${TYPE_TLD}`;
