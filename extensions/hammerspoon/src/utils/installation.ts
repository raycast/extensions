import { getApplications, showToast, Toast, open } from '@raycast/api'

export const HAMMERSPOON_BUNDLE_ID = 'org.hammerspoon.Hammerspoon'

export async function isHammerspoonInstalled() {
  const applications = await getApplications()
  const bundleFound = applications.some(({ bundleId }) => bundleId === HAMMERSPOON_BUNDLE_ID)
  return bundleFound
}

export async function checkHammerspoonInstallation() {
  const isInstalled = await isHammerspoonInstalled()

  if (!isInstalled) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: 'Hammerspoon is not installed.',
      message: 'Install from hammerspoon.org',
      primaryAction: {
        title: 'Go to hammerspoon.org',
        onAction: async (toast) => {
          await open('https://www.hammerspoon.org/')
          await toast.hide()
        }
      }
    }

    await showToast(options)
  }

  return isInstalled
}
