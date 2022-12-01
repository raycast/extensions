import { createClient } from '@scaleway/sdk'
import { getPreferenceValues } from '@raycast/api'
import { getErrorMessage } from '../helpers/errors'

export const CONSOLE_URL = 'https://console.scaleway.com'

export function getScalewayClient() {
  try {
    return createClient({
      accessKey: getPreferenceValues().accessKey,
      secretKey: getPreferenceValues().secretKey,
      defaultRegion: getPreferenceValues().defaultRegion,
      defaultZone: getPreferenceValues().defaultZone,
    })
  } catch (e: unknown) {
    throw new Error(getErrorMessage(e))
  }
}
