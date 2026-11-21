import { environment, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ScratchpadStore, appendText } from "./lib/storage";

export default async function AppendSelection() {
  let selected: string;
  try {
    selected = await getSelectedText();
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Select some text first" });
    return;
  }
  if (!selected.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Select some text first" });
    return;
  }
  try {
    const store = new ScratchpadStore(environment.supportPath);
    const state = store.read();
    store.save(appendText(state.current.text, selected), state.revision);
    await showHUD(`✎ Added ${selected.length} characters to scratchpad`);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't add to scratchpad" });
  }
}
