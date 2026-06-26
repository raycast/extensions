/**
 * Quick Capture — append a line to today's journal.
 *
 * Runs `outl --workspace <ws> daily append --text "<arg>" --json` and
 * shows a HUD on success. This is the killer feature: capture a thought
 * without opening the app.
 */

import { LaunchProps, showHUD } from "@raycast/api";
import { runOutl } from "./lib/cli";
import { showErrorToast } from "./lib/errors";

/** Shape of the `daily append` success payload. */
interface DailyAppendData {
  date: string;
  block_id: string;
  text: string;
}

export default async function QuickCapture(
  props: LaunchProps<{ arguments: { text: string } }>,
): Promise<void> {
  const text = (props.arguments.text ?? "").trim();
  if (text === "") {
    await showHUD("Nothing to capture");
    return;
  }

  try {
    const data = await runOutl<DailyAppendData>([
      "daily",
      "append",
      "--text",
      text,
    ]);
    // `clearRootSearch` wipes the typed argument so the next invocation
    // starts blank instead of replaying the last capture's text.
    await showHUD(`Captured to ${data.date}`, { clearRootSearch: true });
  } catch (err) {
    await showErrorToast(err);
  }
}
