import { getPreferenceValues } from '@raycast/api'

type ExtensionPreferences = {
  apiBaseUrl: string
  authBaseUrl: string
}

export function getPreferences() {
  const preferences = getPreferenceValues<ExtensionPreferences>()

  return {
    apiBaseUrl: preferences.apiBaseUrl.replace(/\/+$/, ''),
    authBaseUrl: preferences.authBaseUrl.replace(/\/+$/, '')
  }
}
