export interface JumpseatConfiguration {
  apiBaseUrl: string;
  webBaseUrl: string;
}

const PRODUCTION_API_URL = "https://api.withjumpseat.com";
const PRODUCTION_WEB_URL = "https://app.withjumpseat.com";

function parseBaseUrl(value: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${label} must be an HTTP origin without a path, credentials, or query.`,
    );
  }

  return url;
}

export function resolveJumpseatConfiguration(
  apiBaseUrl: string,
  webBaseUrl: string,
): JumpseatConfiguration {
  const apiUrl = parseBaseUrl(apiBaseUrl, "Jumpseat API URL");
  const webUrl = parseBaseUrl(webBaseUrl, "Jumpseat Web URL");
  const isProductionPair =
    apiUrl.origin === PRODUCTION_API_URL &&
    webUrl.origin === PRODUCTION_WEB_URL;

  if (!isProductionPair) {
    throw new Error("Use the official Jumpseat API and web URLs together.");
  }

  return {
    apiBaseUrl: apiUrl.origin,
    webBaseUrl: webUrl.origin,
  };
}

export function jumpseatConfigurationId(
  configuration: JumpseatConfiguration,
): string {
  return `${configuration.apiBaseUrl}\n${configuration.webBaseUrl}`;
}
