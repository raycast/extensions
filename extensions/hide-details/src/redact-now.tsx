import { showHUD, showToast, Toast } from "@raycast/api";
import { copiedMessage, copyRedacted, disposeScan, redactClipboard, type Scan } from "./redaction";

export default async function Command() {
  let scan: Scan | undefined;
  try {
    scan = await redactClipboard({ fallbackToHistory: true, guardClipboard: true });
    await copyRedacted(scan, { requireOriginalClipboard: true });
    await showHUD(copiedMessage(scan));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Redact",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (scan) await disposeScan(scan);
  }
}
