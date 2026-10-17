import { showHUD, showToast, Toast } from "@raycast/api";
import { copyRedacted, disposeScan, redactClipboard, type Scan } from "./redaction";

export default async function Command() {
  let scan: Scan | undefined;
  try {
    scan = await redactClipboard();
    await copyRedacted(scan, { requireOriginalClipboard: true });
    const n = scan.regionCount;
    await showHUD(
      n === 0 ? "Copied image. No details detected." : `Copied image with ${n} masked region${n === 1 ? "" : "s"}`,
    );
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
