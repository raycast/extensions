// /Users/morgantitcher/Projects/Github_Local/AdSights/Raycast/OCR-Copy-Paste/ocr-copy-paste-screenshot/src/ocr-copy.tsx

// import { Detail } from "@raycast/api";
// import { useAI } from "@raycast/utils";

// export default function Command() {
//   const { data, isLoading } = useAI("Suggest 5 jazz songs");

//   return <Detail isLoading={isLoading} markdown={data} />;

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
