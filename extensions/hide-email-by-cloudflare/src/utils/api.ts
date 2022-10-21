import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<HideEmailCloudflare.Preferences>();

export const API = {
  createRoutingRule: () => `https://api.cloudflare.com/client/v4/zones/${preferences.zoneID}/email/routing/rules`,
  deleteRoutingRule: (ruleID: string) =>
    `https://api.cloudflare.com/client/v4/zones/${preferences.zoneID}/email/routing/rules/${ruleID}`,
  listRoutingRules: (page: number) =>
    `https://api.cloudflare.com/client/v4/zones/${preferences.zoneID}/email/routing/rules?page=${page}&per_page=20&enabled=true`,
  listDestinationAddresses: () =>
    `https://api.cloudflare.com/client/v4/accounts/${preferences.accountID}/email/routing/addresses?page=1&per_page=50&direction=asc&verified=true`,
  getEmailDomain: () => `https://api.cloudflare.com/client/v4/zones/${preferences.zoneID}/email/routing`,
};
