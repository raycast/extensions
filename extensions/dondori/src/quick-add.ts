import { closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import { quickAdd, SocketUnavailableError } from "./client";
import { quickAddDeepLink } from "./deeplink";

export default async function command(
  props: LaunchProps<{ arguments: { text: string } }>,
) {
  const text = props.arguments.text.trim();
  if (!text) {
    await showHUD("Nothing to add");
    return;
  }
  await closeMainWindow();
  try {
    await quickAdd(text);
    await showHUD("Task added");
  } catch (err) {
    if (err instanceof SocketUnavailableError) {
      await quickAddDeepLink(text);
      await showHUD("Sent to Dondori");
      return;
    }
    await showHUD(
      `Failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
