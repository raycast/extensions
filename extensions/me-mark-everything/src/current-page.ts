import { getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { createPageReader, parsePage, pageReadFailure } from "./page-capture";

import { pageScript } from "./page-script";

export function createPageCapture() {
  let controller: AbortController | undefined;
  const reader = createPageReader(
    async () => {
      if (process.platform !== "darwin") throw Error("Page prefill is available on macOS. Paste a URL.");
      return getFrontmostApplication();
    },
    async (browser) => {
      controller = new AbortController();
      let raw: string;
      try {
        raw = await runAppleScript(pageScript, [browser.bundleId], {
          language: "JavaScript",
          // Allow time for the normal first-use macOS Automation prompt.
          // The form stays editable and retry keeps the original browser.
          timeout: 20000,
          signal: controller.signal,
        });
      } catch (error) {
        // runAppleScript rejects process failures before returning stdout.
        throw pageReadFailure(error, browser);
      }
      return parsePage(raw, browser);
    },
  );
  return {
    ...reader,
    cancel: () => {
      reader.cancel();
      controller?.abort();
    },
  };
}
