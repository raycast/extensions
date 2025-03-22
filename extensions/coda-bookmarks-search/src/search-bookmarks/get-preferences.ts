import { getPreferenceValues } from '@raycast/api'

interface Preferences {
  apiToken: string
  docId: string
  tableId: string
}

export default function getPreferences() {
  const preferences = getPreferenceValues<Preferences>()

  return {
    apiToken: preferences.apiToken,
    docId: preferences.docId,
    tableId: preferences.tableId,
  }
}
