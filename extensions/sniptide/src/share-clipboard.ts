import { Clipboard } from "@raycast/api"
import { messages } from "./lib/messages"
import { quickShare } from "./quick-share"

export default async function ShareClipboard() {
  await quickShare(() => Clipboard.readText(), messages.clipboardEmpty)
}
