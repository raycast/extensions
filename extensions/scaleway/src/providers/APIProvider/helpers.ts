import {
  Clipboard,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from '@raycast/api'
import type { Profile } from '@scaleway/sdk'

const { error } = console

export const getErrorMessage = (e: unknown) => {
  if (e instanceof Error) return e.message

  return String(e)
}

/**
 * Will use the setup preference of the user
 */
export const getPreferenceUser = () => {
  try {
    const { accessKey, secretKey, defaultOrganizationId, defaultRegion, defaultZone } =
      getPreferenceValues<Profile>()

    return {
      accessKey,
      secretKey,
      defaultOrganizationId,
      defaultRegion,
      defaultZone,
    }
  } catch (e: unknown) {
    throw new Error(getErrorMessage(e))
  }
}

export const showToastError = async (e: unknown, title: string) =>
  showToast({
    style: Toast.Style.Failure,
    title,
    message: getErrorMessage(e),
    primaryAction: {
      title: 'Open Preferences',
      onAction: () => {
        openExtensionPreferences().then().catch(error)
      },
    },
    secondaryAction: {
      title: 'Copy Error',
      onAction: () => {
        Clipboard.copy(getErrorMessage(e)).then().catch(error)
      },
    },
  })
