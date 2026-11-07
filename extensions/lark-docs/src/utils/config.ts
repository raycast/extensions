import { getPreferenceValues } from "@raycast/api";

interface LarkDocsPreferences {
  type: "feishu" | "lark" | "self-hosted";
  selfHostedDomain?: string;
  recentListCount?: string;
}

export type Preference = Omit<LarkDocsPreferences, "recentListCount"> & {
  recentListCount: number;
};

function getPreference(): Preference {
  const preference = getPreferenceValues<LarkDocsPreferences>();
  return {
    ...preference,
    recentListCount: Math.max(1, Number(preference.recentListCount) || 15),
  };
}

export const preference = getPreference();

const builtinDomainMap: Partial<Record<Preference["type"], string>> = {
  feishu: "feishu.cn",
  lark: "larksuite.com",
};

export const DOMAIN = preference.selfHostedDomain?.trim() || builtinDomainMap[preference.type] || "";

export function getDomain(subdomain?: string): string {
  if (!DOMAIN) return "";
  return `https://${subdomain ? `${subdomain}.` : ""}${DOMAIN}`;
}

export const GENERAL_DOMAIN = getDomain("www");
