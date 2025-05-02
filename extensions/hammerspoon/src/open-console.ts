import { closeMainWindow } from '@raycast/api'
import { runAppleScript } from '@raycast/utils'
import { checkHammerspoonInstallation } from './utils/installation'

export default async function main() {
  const isInstalled = await checkHammerspoonInstallation()

  if (!isInstalled) {
    return
  }

  await runAppleScript(`
    tell application "Hammerspoon"
      execute lua code "hs.openConsole()"
    end tell
  `)

  await closeMainWindow({ clearRootSearch: true })
}
