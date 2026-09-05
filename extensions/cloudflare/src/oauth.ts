import { getPreferenceValues, OAuth } from '@raycast/api';
import { OAuthService, withAccessToken } from '@raycast/utils';
import Service from './service';

const AUTHORIZE_URL = 'https://dash.cloudflare.com/oauth2/auth';
const TOKEN_URL = 'https://dash.cloudflare.com/oauth2/token';
const CLOUDFLARE_OAUTH_CLIENT_ID = 'ca72e69f68c3b5e273033c5f18eb7adc';

export const CLOUDFLARE_OAUTH_SCOPES = [
  'account-settings.read',
  'analytics.read',
  'cache.purge',
  'dns.read',
  'dns.write',
  'memberships.read',
  'page.read',
  'ssl-and-certificates.read',
  'workers-routes.read',
  'workers-scripts.read',
  'zone.read',
  'zone-settings.read',
  'offline_access',
] as const;

const { token } = getPreferenceValues<ExtensionPreferences>();

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: 'Cloudflare',
  providerIcon: 'icon.png',
  providerId: 'cloudflare',
  description: 'Connect your Cloudflare account to Raycast.',
});

let service: Service | undefined;

export const cloudflare = new OAuthService({
  client,
  clientId: CLOUDFLARE_OAUTH_CLIENT_ID,
  scope: [...CLOUDFLARE_OAUTH_SCOPES],
  authorizeUrl: AUTHORIZE_URL,
  tokenUrl: TOKEN_URL,
  refreshTokenUrl: TOKEN_URL,
  bodyEncoding: 'url-encoded',
  personalAccessToken: token?.trim() || undefined,
  onAuthorize({ token: accessToken }: { token: string }) {
    service = new Service(accessToken);
  },
});

export const withCloudflareAccessToken = withAccessToken(cloudflare);

export function getCloudflareService(): Service {
  if (!service) {
    throw new Error('Cloudflare client is not initialized.');
  }

  return service;
}
