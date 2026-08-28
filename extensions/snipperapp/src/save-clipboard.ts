import { Clipboard, type LaunchProps, open, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getCaptureTarget } from "./lib/last-used";
import { createSnippet, isHelperNotFound } from "./lib/snipper-helper";

const APP_STORE_URL = "https://apps.apple.com/app/id6757330954";

function deriveTitle(text: string): string {
  return (
    text
      .split("\n")
      .find((line) => line.trim().length > 0)
      ?.trim()
      .slice(0, 80) ?? "Untitled"
  );
}

export default async function Command(props: LaunchProps<{ arguments: { title?: string } }>) {
  try {
    const text = (await Clipboard.readText()) ?? "";
    if (!text.trim()) {
      await showHUD("Clipboard is empty");
      return;
    }
    const target = await getCaptureTarget();
    await createSnippet({
      title: props.arguments?.title?.trim() || deriveTitle(text),
      content: text,
      workspace_id: target.workspaceId,
      folder_id: target.folderId,
    });
    await showHUD("✓ Saved to SnipperApp");
  } catch (error) {
    if (isHelperNotFound(error)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "SnipperApp isn't installed",
        primaryAction: { title: "Get SnipperApp", onAction: () => open(APP_STORE_URL) },
      });
      return;
    }
    await showFailureToast(error, { title: "Couldn't save snippet" });
  }
}
