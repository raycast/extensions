import type { CaptureInput, Paste } from "@sniptide/sdk"
import { type CaptureOptions, captureFromText } from "./capture"

// The part of the client the share commands use, so a test can stand in for Sniptide.
interface PasteCreator {
  createPaste(input: CaptureInput, idempotencyKey?: string): Promise<{ paste: Paste }>
}

export class NothingToShareError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NothingToShareError"
  }
}

export interface ShareSteps {
  // The text to share, or nothing when the selection or clipboard holds none.
  read(): Promise<string | undefined>
  // The sentence to show when there is nothing to share.
  empty: string
  client: PasteCreator
  options: CaptureOptions
  copy(link: string): Promise<void>
  key(): string
}

// Creates a paste from the text and copies its link. The idempotency key lets Sniptide answer a
// retried request with the paste it already made.
export async function share(steps: ShareSteps) {
  const text = await steps.read()
  if (!text?.trim()) throw new NothingToShareError(steps.empty)
  const { paste } = await steps.client.createPaste(
    captureFromText(text, steps.options),
    steps.key(),
  )
  await steps.copy(paste.url)
  return paste
}
