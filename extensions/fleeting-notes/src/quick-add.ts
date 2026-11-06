import { LaunchProps, environment, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ScratchpadStore, appendText } from "./lib/storage";

export default async function QuickAdd(props: LaunchProps<{ arguments: Arguments.QuickAdd }>) {
  const text = props.arguments.text?.trim();
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Type something to add" });
    return;
  }
  try {
    const store = new ScratchpadStore(environment.supportPath);
    const state = store.read();
    store.save(appendText(state.current.text, text), state.revision);
    await showHUD("✎ Added to scratchpad");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't add to scratchpad" });
  }
}
