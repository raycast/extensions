import { getPreferenceValues } from '@raycast/api'

interface Preferences {
  apiToken: string
  docId: string
  tableName: string
}

export default function getPreferences() {
  const preferences = getPreferenceValues<Preferences>()

  return {
    apiToken: preferences.apiToken,
    docId: preferences.docId,
    tableName: preferences.tableName,
  }
}
