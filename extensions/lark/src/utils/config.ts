import { getPreferenceValues } from '@raycast/api';

export interface Preference {
  type: 'feishu' | 'lark' | 'self-hosted';
  selfHostedDomain?: string;
  recentListCount: number;
}

export function getPreference(): Preference {
  const preference = getPreferenceValues<Preference>();
  preference.recentListCount = Number(preference.recentListCount) || 15;
  return preference;
}

export const preference = getPreference();

const builtinDomainMap: Partial<Record<Preference['type'], string>> = {
  feishu: 'feishu.cn',
  lark: 'larksuite.com',
};
export const DOMAIN = preference.selfHostedDomain?.trim() || builtinDomainMap[preference.type];

export function getDomain(sub?: string): string {
  return `https://${sub ? `${sub}.` : ''}${DOMAIN}`;
}

export const GENERAL_DOMAIN = getDomain('www');
