import { Clipboard, showHUD } from "@raycast/api";
import { clearActiveState, getActiveState, getDemos, setActiveState } from "./storage";

export default async function NextSnippet() {
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

  if (state.index >= demo.snippets.length) {
    await clearActiveState();
    await showHUD("Demo finished. State cleared.");
    return;
  }

  const snippet = demo.snippets[state.index];
  await Clipboard.paste(snippet.text);

  const nextIndex = state.index + 1;
  if (nextIndex >= demo.snippets.length) {
    await clearActiveState();
    return;
  }

  await setActiveState({ demoId: demo.id, index: nextIndex });
}
