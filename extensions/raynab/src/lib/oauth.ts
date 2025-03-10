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
  clientId: 'Kip713bERUJALBa7Su39oMdKq654DQptcnDDjopMcWw',
  authorizeUrl:
    'https://oauth.raycast.com/v1/authorize/LkN-CsgOGEHKPLO1GiAaXNas5bfsfqAEpeLVbiRlax5viDSFpKJ3vJXuX_8BhLN84N_berv6F_uvw-MjI72Uh4Yu4t3dUYP-LOn8wlVVuXDNQ47CoerGi64kosHEEEHquYKwzsrqu3R780sklA',
  tokenUrl:
    'https://oauth.raycast.com/v1/token/PZQScRaArwZQUfzavGp_iiqHUIvP7d9Rw-EvYQwWIjQ98FRxTz6PkMNsKSWJJ3bNCTx_xnucAj5fTFqZIbV1AWgdTOEPYjnuiqxiamDSbmjfcLPZB7-SKY6r2MkVDwnJ0u9KwgiR-5Mq',
  refreshTokenUrl:
    'https://oauth.raycast.com/v1/refresh-token/ajBcGDZqQ5RrRLNTXFTrR1G1KwO9iy6A_vgqMOGwj6sxu4zzoy-AmjnCvxK90BUGBPx5M1mVk8r0d_DR1_Hy-KVPnHpaM4geYXvR4CQ2ImbJwy-17FUi4zX5WR2Nq3SUN-27HQJPs0Xu',
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
