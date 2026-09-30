import { Toast, closeMainWindow, showHUD, showToast } from '@raycast/api'
import { runAppleScript } from '@raycast/utils'

export type FloatyCommandOptions = {
  script: string
  successMessage: string
  failureTitle?: string
}

export async function runFloatyCommand({
  script,
  successMessage,
  failureTitle = 'Floaty command failed',
}: FloatyCommandOptions) {
  try {
    await runAppleScript(script)
    await closeMainWindow({ clearRootSearch: true })
    await showHUD(successMessage)
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error)
    let toastTitle = failureTitle

    if (message.includes('requires a Pro license')) {
      toastTitle = 'Floaty Pro required'
      message = 'This automation command needs a Floaty Pro license.'
    }

    await showToast({
      style: Toast.Style.Failure,
      title: toastTitle,
      message,
    })
    await showHUD(`⚠️ ${message}`)
    return
  }
}
