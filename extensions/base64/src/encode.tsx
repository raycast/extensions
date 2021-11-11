import { showHUD } from "@raycast/api"
import { runAppleScript } from "run-applescript"
import { copyTextToClipboard } from "@raycast/api"
import { encode } from "js-base64"
export default async () => {
  const clipboard = await runAppleScript('the clipboard')
  const encoded = encode(clipboard)
  await copyTextToClipboard(encoded)
  showHUD("Copied to clipboard")
}