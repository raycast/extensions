import { Clipboard, showHUD } from "@raycast/api";
import { clearActiveState, getActiveState, getDemos, setActiveState } from "./storage";

export default async function PreviousSnippet() {
  const demos = await getDemos();
  const state = await getActiveState();

  if (!state) {
    await showHUD("No active demo");
    return;
  }

  const demo = demos.find((item) => item.id === state.demoId);
  if (!demo) {
    await clearActiveState();
    await showHUD("Active demo not found. State cleared.");
    return;
  }

  if (demo.snippets.length === 0) {
    await showHUD("Demo has no snippets");
    return;
  }

  if (state.index <= 0) {
    await showHUD("Already at the first snippet");
    return;
  }

  const previousIndex = state.index - 1;
  const snippet = demo.snippets[previousIndex];
  await Clipboard.paste(snippet.text);
  await setActiveState({ demoId: demo.id, index: previousIndex });
}
