import { getSelectedText } from "@raycast/api"
import { messages } from "./lib/messages"
import { quickShare } from "./quick-share"

export default async function ShareSelection() {
  // Raycast throws when the frontmost app has no selection or doesn't expose one.
  await quickShare(() => getSelectedText().catch(() => undefined), messages.nothingSelected)
}
