import { closeMainWindow } from '@raycast/api'
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
          local hsApp = hs.application.get(hs.processInfo.bundleID)

          if hsApp then
            hsApp:activate()
            hs.doc.hsdocs.help()
            local hsDocsWindow = hsApp:findWindow('Hammerspoon docs')

            if hsDocsWindow then
              hsDocsWindow:focus()
            end
          end
        "
      end tell
    `)
  } catch (error) {
    await showFailureToast(error, { title: 'Could not open Hammerspoon documentation' })
    return
  }

  await closeMainWindow({ clearRootSearch: true })
}
