import { getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { attempt } from "./components";
import { askInYab } from "./yab";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AskInYab }>) {
  const prompt = props.arguments.prompt?.trim() || props.fallbackText?.trim() || "";
  const { send } = getPreferenceValues<Preferences.AskInYab>();
  await attempt("Couldn't open ⌘J", async () => {
    await askInYab(prompt, Boolean(send) && prompt.length > 0);
    if (!prompt) await showHUD("⌘J is open in Yab");
  });
}
