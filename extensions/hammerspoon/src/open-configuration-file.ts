import { getPreferenceValues, open, closeMainWindow, Application } from '@raycast/api'
import { runAppleScript, showFailureToast } from '@raycast/utils'
import { checkHammerspoonInstallation } from './utils/installation'

export default async function main() {
  const isInstalled = await checkHammerspoonInstallation()

  if (!isInstalled) {
    return
  }

  try {
    let configFilePath: string | undefined = getPreferenceValues().configFilePath
    const editorApp: Application | undefined = getPreferenceValues().editorApp

    if (configFilePath == null) {
      configFilePath = await runAppleScript(`
        tell application "Hammerspoon"
          execute lua code "
            return hs.configdir .. '/init.lua'
          "
        end tell
      `)
    }

    await closeMainWindow({ clearRootSearch: true })

    if (editorApp) {
      await open(configFilePath, editorApp)
    } else {
      await open(configFilePath)
    }
  } catch (error) {
    await showFailureToast(error, { title: 'Could not open Hammerspoon configuration file' })
    return
  }
}
