import { Clipboard, closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api"
import { messages } from "./lib/messages"

export type CodeAction = "paste" | "copy"

// The Search Pastes preference declared in package.json.
export function primaryAction(): CodeAction {
  const { primaryAction } = getPreferenceValues<{ primaryAction?: CodeAction }>()
  return primaryAction === "copy" ? "copy" : "paste"
}

export async function deliver(content: string, action: CodeAction) {
  if (action === "copy") {
    await Clipboard.copy(content)
    await showHUD(messages.codeCopied)
    return
  }
  // The window closes first, so the app the reader came from takes the paste.
  await closeMainWindow({ clearRootSearch: true })
  await Clipboard.paste(content)
}
