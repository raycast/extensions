import { showHUD } from "@raycast/api"
import { runAppleScript } from "run-applescript"
import { copyTextToClipboard } from "@raycast/api"
import { decode } from "js-base64"
export default async () => {
  const clipboard = await runAppleScript('the clipboard')
  const decoded = decode(clipboard)
  await copyTextToClipboard(decoded)
  showHUD("Copied to clipboard")
}