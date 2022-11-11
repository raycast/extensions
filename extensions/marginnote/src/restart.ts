import { closeMainWindow, showHUD } from "@raycast/api"
import { restartMN } from "./utils/applescript"

export default async function () {
  await closeMainWindow()
  await showHUD("Restarting MarginNote 3...")
  await restartMN()
  return null
}
