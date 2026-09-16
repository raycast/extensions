export interface JumpseatConfiguration {
  apiBaseUrl: string;
  webBaseUrl: string;
}

const PRODUCTION_API_URL = "https://api.withjumpseat.com";
const PRODUCTION_WEB_URL = "https://app.withjumpseat.com";

export function getProductionJumpseatConfiguration(): JumpseatConfiguration {
  return {
    apiBaseUrl: PRODUCTION_API_URL,
    webBaseUrl: PRODUCTION_WEB_URL,
  };
}

export function jumpseatConfigurationId(
  configuration: JumpseatConfiguration,
): string {
  return `${configuration.apiBaseUrl}\n${configuration.webBaseUrl}`;
}
