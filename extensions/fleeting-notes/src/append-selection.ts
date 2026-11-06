import { environment, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { ScratchpadStore, appendText } from "./lib/storage";

export default async function AppendSelection() {
  let selected: string;
  try {
    selected = (await getSelectedText()).trim();
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Select some text first" });
    return;
  }
  if (!selected) {
    await showToast({ style: Toast.Style.Failure, title: "Select some text first" });
    return;
  }
  try {
    const store = new ScratchpadStore(environment.supportPath);
    const state = store.read();
    store.save(appendText(state.current.text, selected), state.revision);
    await showHUD(`✎ Added ${selected.length} characters to scratchpad`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't add to scratchpad",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
