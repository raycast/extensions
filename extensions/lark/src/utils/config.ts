import { getPreferenceValues } from '@raycast/api';

export interface Preference {
  type: 'feishu' | 'lark';
  subdomain: string;
  recentListCount: number;
}

export function getPreference(): Preference {
  const preference = getPreferenceValues<Preference>();
  preference.recentListCount = Number(preference.recentListCount) || 15;
  return preference;
}

export const preference = getPreference();

export const DOMAIN = preference.type === 'feishu' ? 'feishu.cn' : 'larksuite.com';

export function getDomain(sub?: string): string {
  return `https://${sub ? `${sub}.` : ''}${DOMAIN}`;
}

export const GENERAL_DOMAIN = getDomain('www');

export const TENANT_DOMAIN = getDomain(preference.subdomain);

export const INTERNAL_API_DOMAIN = getDomain('internal-api-space');
