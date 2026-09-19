export const KATO_OAUTH_CLIENT_ID = "kato-raycast";
export const KATO_OAUTH_SCOPE =
  "tasks:read tasks:write records:read objects:read meetings:read activity:read notifications:read notifications:write comments:write";

export function hasRequiredOAuthScopes(grantedScope: string | undefined) {
  if (!grantedScope) return false;
  const granted = new Set(grantedScope.split(/\s+/).filter(Boolean));
  return KATO_OAUTH_SCOPE.split(" ").every((scope) => granted.has(scope));
}

export function katoOAuthEndpoints(isDevelopment: boolean) {
  const webOrigin = isDevelopment
    ? "http://localhost:3001"
    : "https://app.getkato.io";
  const apiOrigin = isDevelopment
    ? "http://localhost:3000"
    : "https://api.getkato.io";

  return {
    authorizeUrl: `${webOrigin}/oauth/authorize`,
    tokenUrl: `${apiOrigin}/oauth/token`,
  };
}

export function katoApiBaseUrl(isDevelopment: boolean) {
  const apiOrigin = isDevelopment
    ? "http://localhost:3000"
    : "https://api.getkato.io";
  return `${apiOrigin}/v1/raycast`;
}
