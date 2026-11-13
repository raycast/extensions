export interface JumpseatConfiguration {
  apiBaseUrl: string;
  webBaseUrl: string;
  authBaseUrl: string;
}

const PRODUCTION_API_URL = "https://api.withjumpseat.com";
const PRODUCTION_WEB_URL = "https://app.withjumpseat.com";
export const PRODUCTION_AUTH_URL = "https://auth.withjumpseat.com";

type ConfigurationEnvironment = Record<string, string | undefined>;

export function normalizeOAuthOrigin(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

function configuredAuthUrl(env: ConfigurationEnvironment): string {
  return normalizeOAuthOrigin(env.JUMPSEAT_AUTH_ORIGIN) ?? PRODUCTION_AUTH_URL;
}

export function getProductionJumpseatConfiguration(
  env: ConfigurationEnvironment = process.env,
): JumpseatConfiguration {
  return {
    apiBaseUrl: PRODUCTION_API_URL,
    webBaseUrl: PRODUCTION_WEB_URL,
    authBaseUrl: configuredAuthUrl(env),
  };
}

export function jumpseatConfigurationId(
  configuration: JumpseatConfiguration,
): string {
  // OAuth credentials are issued for the API resource. The authorization
  // authority can move independently, so it must not invalidate a healthy
  // stored Raycast session during an auth-host migration.
  return configuration.apiBaseUrl;
}

export function isCompatibleJumpseatConfigurationId(
  storedConfigurationId: string | undefined,
  configuration: JumpseatConfiguration,
): boolean {
  if (storedConfigurationId === jumpseatConfigurationId(configuration)) {
    return true;
  }

  return isLegacyJumpseatConfigurationId(storedConfigurationId);
}

export function isLegacyJumpseatConfigurationId(
  storedConfigurationId: string | undefined,
): boolean {
  // Released versions fingerprinted both fixed production origins. Accept
  // precisely that value, but retain its protocol marker and authority.
  return (
    storedConfigurationId === `${PRODUCTION_API_URL}\n${PRODUCTION_WEB_URL}`
  );
}

export function legacyJumpseatConfigurationId(): string {
  return `${PRODUCTION_API_URL}\n${PRODUCTION_WEB_URL}`;
}

export function trustedOAuthOrigins(
  configuration: JumpseatConfiguration,
  env: ConfigurationEnvironment = process.env,
): Set<string> {
  const origins = new Set([PRODUCTION_AUTH_URL, configuration.authBaseUrl]);
  for (const value of (env.JUMPSEAT_TRUSTED_AUTH_ORIGINS ?? "").split(",")) {
    const origin = normalizeOAuthOrigin(value);
    if (origin) origins.add(origin);
  }
  return origins;
}

export function isTrustedOAuthIssuer(
  issuer: string | undefined,
  configuration: JumpseatConfiguration,
  env: ConfigurationEnvironment = process.env,
): issuer is string {
  return (
    issuer !== undefined &&
    normalizeOAuthOrigin(issuer) === issuer &&
    trustedOAuthOrigins(configuration, env).has(issuer)
  );
}

export function resolveStoredCentralOAuthIssuer(
  storedIssuer: string | undefined,
  configuration: JumpseatConfiguration,
  env: ConfigurationEnvironment = process.env,
): string | undefined {
  if (storedIssuer) {
    return isTrustedOAuthIssuer(storedIssuer, configuration, env)
      ? storedIssuer
      : undefined;
  }

  // Central credentials written before issuer metadata existed can only be
  // safely recovered when the canonical production issuer is still current.
  // An overridden authority is not evidence of the original issuer.
  return configuration.authBaseUrl === PRODUCTION_AUTH_URL
    ? PRODUCTION_AUTH_URL
    : undefined;
}
