import { getPreferenceValues, popToRoot, showHUD, showToast, Toast } from '@raycast/api'
import { runAppleScript, showFailureToast } from '@raycast/utils'

import { checkHammerspoonInstallation } from './utils/installation'

export default async function main() {
  const isInstalled = await checkHammerspoonInstallation()

  if (!isInstalled) {
    return
  }

  popToRoot({ clearSearchBar: true })

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: '🔨 Restarting Hammerspoon'
  })

  let output

  try {
    output = await runAppleScript(`
      try
        tell application "Hammerspoon"
          execute lua code "hs.relaunch()"
        end tell
      on error errMsg number errNum
        if errNum is -609 then
          -- Expected to fail here because the relaunch
          -- check again in two seconds if it started again
          delay 1.2
          if application "Hammerspoon" is running then
            return true
          else
            return false
          end if
        else
          -- Propagate other errors
          error errMsg number errNum
        end if
      end try
    `)
  } catch (error) {
    await showFailureToast(error, { title: 'Could not restart Hammerspoon' })
    return
  }

  if (output === 'true') {
    if (getPreferenceValues().openConsole) {
      try {
        await runAppleScript(`
          tell application "Hammerspoon"
            execute lua code "hs.openConsole()"
          end tell
        `)
      } catch (error) {
        await showFailureToast(error, { title: 'Could not open Hammerspoon console' })
        return
      }
    }

    await showHUD('🔨 Hammerspoon was restarted')
  } else {
    toast.style = Toast.Style.Failure
    toast.title = '🔨 Hammerspoon was restarted but we could not detect if it started again. Please check manually.'
  }
}
