import { getPreferenceValues } from "@raycast/api"

interface Preferences {
  strictMode: boolean
}

export const preferences = getPreferenceValues<Preferences>()
