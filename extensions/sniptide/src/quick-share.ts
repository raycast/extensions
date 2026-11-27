import { randomUUID } from "node:crypto"
import { Clipboard, showHUD, showToast, Toast } from "@raycast/api"
import { client, defaultVisibility } from "./api"
import { messages } from "./lib/messages"
import { NothingToShareError, share } from "./lib/share"
import { report } from "./report"

// Runs a command without a window: saves the text as a paste and copies its link.
export async function quickShare(read: () => Promise<string | undefined>, empty: string) {
  const toast = await showToast({ style: Toast.Style.Animated, title: messages.creating })
  try {
    await share({
      read,
      empty,
      client: client(),
      options: { visibility: defaultVisibility() },
      copy: (link) => Clipboard.copy(link),
      key: randomUUID,
    })
    await showHUD(messages.linkCopied)
  } catch (error) {
    if (error instanceof NothingToShareError) {
      toast.style = Toast.Style.Failure
      toast.title = error.message
      return
    }
    await report(error, messages.createFailed)
  }
}
