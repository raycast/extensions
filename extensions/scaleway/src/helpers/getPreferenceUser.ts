import {
  Alert,
  Clipboard,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from '@raycast/api'
import { loadProfileFromConfigurationFile } from '@scaleway/configuration-loader'
import type { Profile } from '@scaleway/sdk'

type PreferenceValues = Profile & {
  profileName?: string
}

const { error } = console

export const getErrorMessage = (e: unknown) => {
  if (e instanceof Error) return e.message

  return String(e)
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

export const showAlertError = async (e: unknown, title: string) => {
  const options: Alert.Options = {
    title,
    message: getErrorMessage(e),
    primaryAction: {
      style: Alert.ActionStyle.Destructive,
      title: 'Open Preferences',
      onAction: () => {
        openExtensionPreferences().then().catch(error)
      },
    },
  }
  await confirmAlert(options)
}

/**
 * Will use the setup preference of the user
 */
export const getPreferenceUser = () => {
  try {
    const { accessKey, secretKey, defaultOrganizationId, defaultRegion, defaultZone, profileName } =
      getPreferenceValues<PreferenceValues>()

    if (profileName) {
      try {
        const config = loadProfileFromConfigurationFile({
          profileName,
        })

        return config
      } catch (err) {
        showAlertError(
          'Your profile is not well configure, check your file ~/.config/scw/config.yaml',
          `Profile Config ${profileName}`
        )
          .then()
          .catch(() => {})
      }
    }

    return {
      accessKey,
      secretKey,
      defaultOrganizationId,
      defaultRegion,
      defaultZone,
    }
  } catch (e: unknown) {
    showAlertError(getErrorMessage(e), 'Get Preferences').catch(() => {})

    throw new Error(getErrorMessage(e))
  }
}
