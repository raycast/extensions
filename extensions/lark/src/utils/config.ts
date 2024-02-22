import { getPreferenceValues } from '@raycast/api';

export type Preference = Override<
  ExtensionPreferences,
  {
    recentListCount: number;
  }
>;

function getPreference(): Preference {
  const preference = getPreferenceValues<ExtensionPreferences>();
  return {
    ...preference,
    recentListCount: Number(preference.recentListCount) || 15,
  };
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
export const TENANT_DOMAIN = getDomain('tenant');
