export const getBearerTokenHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export interface ConfigCenterPreference {
  configurationId: string;
  oauthClientKey: string;
}
