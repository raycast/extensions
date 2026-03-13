import { OAuth } from '@raycast/api'

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: 'Notion',
  providerId: 'hypersonic',
  providerIcon: 'notion-logo.png',
  description: 'Connect your Notion account to Hypersonic',
})
