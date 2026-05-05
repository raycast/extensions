import { getApiConfig } from "./config";

export function getEmailRoutingEndpoints() {
  const config = getApiConfig();
  const baseUrl = `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/email/routing`;

  return {
    settings: baseUrl,
    rules: `${baseUrl}/rules`,
    ruleById: (id: string) => `${baseUrl}/rules/${id}`,
  };
}
