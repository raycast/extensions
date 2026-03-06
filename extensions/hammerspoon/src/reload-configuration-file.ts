import { getPreferenceValues, showHUD } from '@raycast/api'
import { runAppleScript, showFailureToast } from '@raycast/utils'
import { checkHammerspoonInstallation } from './utils/installation'

export default async function main() {
  const isInstalled = await checkHammerspoonInstallation()

  if (!isInstalled) {
    return
  }

  try {
    await runAppleScript(`
      tell application "Hammerspoon"
        execute lua code "
          ${getPreferenceValues().clearConsole ? 'hs.console.clearConsole();' : ''}
          hs.reload();
          ${getPreferenceValues().openConsole ? 'hs.openConsole();' : ''}
        "
      end tell
    `)
  } catch (error) {
    await showFailureToast(error, { title: 'Could not reload Hammerspoon configuration' })
    return
  }

  await showHUD('🔨 Hammerspoon Configuration File Reloaded')
}
