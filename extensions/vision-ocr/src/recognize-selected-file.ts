import { getSelectedFinderItems, showHUD } from "@raycast/api";
import { recognizeFile } from "swift:../swift";
import { OCRResult, hideRaycast, ocrOptions, run } from "./lib/run";

export default async function Command() {
  // Read the Finder selection before hiding Raycast, while Finder is still the target.
  const items = await getSelectedFinderItems().catch(() => []);
  await hideRaycast();
  if (items.length === 0) {
    await showHUD("Select an image or PDF in Finder first");
    return;
  }
  const options = ocrOptions();
  await run(async () => {
    // One unreadable file shouldn't lose the text from the others.
    const settled = await Promise.allSettled(
      items.map((item) => recognizeFile(item.path, options) as Promise<OCRResult>),
    );
    const results = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));
    const ok = results.filter((r) => r.status === "ok");
    if (ok.length > 0) return { status: "ok", pages: ok.flatMap((r) => r.pages) };
    if (results.length > 0) return results[0];
    throw (settled[0] as PromiseRejectedResult).reason;
  });
}
