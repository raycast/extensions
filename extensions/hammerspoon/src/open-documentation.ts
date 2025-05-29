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
          hs.doc.hsdocs.help()
          hs.doc.hsdocs._browser:hswindow():focus()
        "
      end tell
    `)
  } catch (error) {
    await showFailureToast(error, { title: 'Could not open Hammerspoon documentation' })
    return
  }

  await closeMainWindow({ clearRootSearch: true })
}
