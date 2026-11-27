import { openExtensionPreferences } from "@raycast/api"
import { showFailureToast } from "@raycast/utils"
import { describe } from "./lib/errors"
import { messages } from "./lib/messages"

// Shows a failure. One the preferences can fix offers the way there.
export async function report(error: unknown, title: string) {
  const failure = describe(error)
  await showFailureToast(error, {
    title,
    message: failure.message,
    primaryAction: failure.preferences
      ? { title: messages.openPreferences, onAction: () => openExtensionPreferences() }
      : undefined,
  })
}
