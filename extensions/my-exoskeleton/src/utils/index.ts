export const getBearerTokenHeader = (token: string) => ({ Authorization: `Bearer ${token}` })

export interface ConfigCenterPreference {
  configurationId: string
  secondConfigurationId: string | null
  oauthClientKey: string
}
