import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api"
import { isMarginNoteInstalled } from "./utils"
import { restartMN } from "./utils/applescript"

export default async function () {
  if (await isMarginNoteInstalled()) {
    await showHUD("Restarting MarginNote 3...")
    await closeMainWindow()
    await restartMN()
  } else
    showToast(Toast.Style.Failure, "Error", "MarginNote 3 is not installed")
  return null
}
