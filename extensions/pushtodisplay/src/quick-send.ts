import { LaunchProps, getPreferenceValues, showHUD } from "@raycast/api";
import { sendUpdate } from "./api";
import type { PanelId } from "./types";

/**
 * Quick Send — send the provided text using the extension preferences:
 * `defaultBoardId` and `defaultPanelId` if set, otherwise the API defaults.
 * Zero friction: ⌘Space → "Quick Send" → text → Enter.
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickSend }>) {
  const text = props.arguments.text.trim();
  if (!text) {
    await showHUD("Quick Send needs a message");
    return;
  }

  const { defaultBoardId, defaultPanelId } = getPreferenceValues<Preferences.QuickSend>();
  const panel = Number(defaultPanelId);
  const panelId = Number.isInteger(panel) && panel >= 1 && panel <= 4 ? (panel as PanelId) : undefined;

  try {
    const res = await sendUpdate({
      blocks: [{ text }],
      // Use setting value if present; omit the field otherwise (API defaults apply).
      boardId: defaultBoardId?.trim() || undefined,
      panelId,
    });
    await showHUD(`Update sent ✓ (${res.messageId})`);
  } catch (err) {
    await showHUD(`Update failed: ${(err as Error).message}`);
  }
}
