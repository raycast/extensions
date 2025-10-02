
import { performOcrCopyFlow } from "./flow"

/**
 * Command entrypoint (no-view): capture a screenshot, OCR it, and copy text to clipboard.
 *
 * @remarks
 * All user feedback is shown via toasts/HUD within {@link performOcrCopyFlow}. This command intentionally renders
 * no UI in order to be as quick as possible from the launcher.
 */
export default async function Command(): Promise<void> {
  await performOcrCopyFlow()
}
