import { getPreferenceValues } from '@raycast/api';

type Preferences = {
  workspaceUrl: string;
  apiBaseUrl?: string;
};

const stripTrailingSlash = (url: string) => url.trim().replace(/\/+$/, '');

// The workspace subdomain, e.g. https://acme.app.deserveos.com. Used as the
// `origin` for sign-in (the server resolves the workspace from it) and as the
// base for "Open in DeserveOS" links.
export const getWorkspaceUrl = (): string =>
  stripTrailingSlash(getPreferenceValues<Preferences>().workspaceUrl);

// The API host. In production every workspace talks to the same central host
// (REACT_APP_SERVER_BASE_URL = https://app.deserveos.com); workspace scoping is
// carried by the access token, not the hostname.
export const getApiBaseUrl = (): string => {
  const { apiBaseUrl } = getPreferenceValues<Preferences>();
  return stripTrailingSlash(
    apiBaseUrl && apiBaseUrl.trim().length > 0
      ? apiBaseUrl
      : 'https://app.deserveos.com',
  );
};

// DeserveOS serves two GraphQL schemas: /metadata hosts auth + AI chat + custom
// DeserveOS resolvers; /graphql hosts the dynamic workspace records (people,
// companies, opportunities, tasks).
export const getMetadataEndpoint = (): string => `${getApiBaseUrl()}/metadata`;
export const getCoreEndpoint = (): string => `${getApiBaseUrl()}/graphql`;
