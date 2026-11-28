import { getSelectedText, LaunchProps } from "@raycast/api";
import { launchWithSelection } from "./launch";
import { loadConnection } from "./connection";
import { isSetUp } from "./llm";
import { quickReplace, quickReplaceOn } from "./quick-replace";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Rewrite }>) {
  const typed = props.arguments.text?.trim();
  // Quick Replace works on a selected draft only: typed text has nothing to replace.
  await loadConnection();
  // Before the first AI Setup, the usual view starts there.
  if (!typed && quickReplaceOn() && isSetUp()) {
    const selected = (await getSelectedText().catch(() => "")).trim();
    if (selected && (await quickReplace(selected))) return;
    // Could not (no selection, setup or network error): the usual view shows what happened.
    return launchWithSelection("rewrite", selected);
  }
  await launchWithSelection("rewrite", typed);
}
