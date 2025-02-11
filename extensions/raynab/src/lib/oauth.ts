import { getPreferenceValues, OAuth } from '@raycast/api';
import { OAuthService } from '@raycast/utils';
import * as ynab from 'ynab';

const preferences = getPreferenceValues<Preferences>();

let ynabClient: ynab.API | null = null;

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: 'YNAB',
  providerIcon: 'command-icon.png',
  description: 'Connect your YNAB account',
});

export const ynabProvider = new OAuthService({
  client,
  clientId: 'e0J0uvj2zIU9Vp8ue8yT_o51RYx_VbGkDPG-ZW6ipa0',
  authorizeUrl:
    'https://oauth.raycast.com/v1/authorize/yAdKt7a1JKjDi4FxKMwNAZfu_5hoB2zNNUa9MVdqdix0EzDG-9N59EXRGe9lHC1lTcHw7bP1WxWCsJFHQZlJwlsQl-JW5eyK0LmW65CtGhi5dNnQu6XGxyKWv4NkWTYPexjOo8VoNlAxzHEfsQ',
  tokenUrl:
    'https://oauth.raycast.com/v1/token/4uwwjlATwWSZH5t2kn42nUNVOhbcPlkCEFChbM5XHHxzQ09HuAEqL1EVlKlnIrvdngGZggf0dKM8MvvncUhN7Q0cyTu4WHtsMz5thFvI1z4aXD-4MMiuKnIZ-OH49IWHsDeIuv8Ql-p-',
  refreshTokenUrl:
    'https://oauth.raycast.com/v1/refresh-token/SkKMzlfwA2aL59UhiwLWO4hrDLPNrvN3eMnt2reSzjHFKXMPII2q9lhK0lrBbkMgnvHNLRI1aNJa2NhKltTM26S-NGhNIMWBTcfxqb1ZoKxwdIDnK8cDGol0uNHZmmARzeU9I3P8e5bX',
  scope: '',
  async onAuthorize({ token }) {
    ynabClient = new ynab.API(token);
  },
  personalAccessToken: preferences.apiToken,
});

export function getYNABClient() {
  if (!ynabClient) {
    throw new Error('No YNAB client initialized');
  }

  return ynabClient;
}
