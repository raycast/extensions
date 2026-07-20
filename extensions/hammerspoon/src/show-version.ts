import { showHUD, showToast, Toast } from '@raycast/api'
import { runAppleScript, showFailureToast } from '@raycast/utils'
import { checkHammerspoonInstallation } from './utils/installation'

export default async function main() {
  const isInstalled = await checkHammerspoonInstallation()

  if (!isInstalled) {
    return
  }

  let output

  try {
    output = await runAppleScript(`
      tell application "Hammerspoon"
        set hammerspoonVersion to version
        return hammerspoonVersion
      end tell
    `)
  } catch (error) {
    await showFailureToast(error, { title: 'Could not get Hammerspoon version' })
    return
  }

  if (output != null && output !== '') {
    await showHUD(`🔨 Hammerspoon version: ${output}`)
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: '🔨 Unable to get Hammerspoon version.'
    })
  }
}
