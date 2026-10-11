import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { getLayoutKeyMaps } from "swift:../swift";
import {
  detectSourceLayout,
  getTargetOrder,
  pickNextTarget,
  selectLine,
} from "./utils";
import { HistoryManager } from "./SessionManager";
import { LayoutManager } from "./LayoutManager";

export default async function main() {
  // 1. Load layouts + history BEFORE getSelectedText to minimize selection-to-paste gap
  let layouts;
  let history;
  try {
    [layouts, history] = await Promise.all([
      getLayoutKeyMaps().then((ls) =>
        ls.filter((l) => l.keyMap && l.keyMap.length > 0),
      ),
      HistoryManager.load(),
    ]);
  } catch (e) {
    await showHUD(`Error loading layouts: ${(e as Error).message}`);
    return;
  }

  if (layouts.length < 2) {
    await showHUD("Need at least 2 keyboard layouts with key data");
    return;
  }

  // 2. Get selected text — NOW, right before detection + paste
  let selectedText = "";
  try {
    selectedText = await getSelectedText();
  } catch {
    try {
      await selectLine();
      selectedText = await getSelectedText();
    } catch {
      await showHUD("Please select text");
      return;
    }
  }

  if (!selectedText) {
    await showHUD("Please select text");
    return;
  }

  // 3. Detect source layout (prefer active layout, then history as tiebreakers)
  const activeId = layouts.find((l) => l.active)?.id;
  const sourceLayout = detectSourceLayout({
    text: selectedText,
    layouts: layouts,
    activeId,
    historyOrder: history.targetOrder,
  });
  if (!sourceLayout) {
    await showHUD("Could not detect source layout");
    return;
  }

  // 4. Pick target and transform (prefer the currently active layout first)
  const targetOrder = getTargetOrder({
    layouts: layouts,
    sourceId: sourceLayout.id,
    historyOrder: history.targetOrder,
    activeId,
  });

  const pick = pickNextTarget(
    selectedText,
    sourceLayout.keyMap,
    targetOrder,
    [],
  );

  if (pick.transformed === selectedText) {
    await showHUD("Nothing to retype");
    return;
  }

  // 5. Paste and switch keyboard layout
  try {
    await new Promise((r) => setTimeout(r, 50));
    await Clipboard.paste(pick.transformed);
    await LayoutManager.setInput(pick.target.id);
    await showHUD(`✅ ${pick.target.title}`);
  } catch (e) {
    await showHUD((e as Error).message);
    return;
  }

  await HistoryManager.recordSuccess(pick.target.id);
}
