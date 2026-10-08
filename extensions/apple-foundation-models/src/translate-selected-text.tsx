import { getPreferenceValues, LaunchProps } from "@raycast/api";
import { SelectedTextCommand } from "./components/SelectedTextCommand";

export default function Command(props: LaunchProps<{ arguments: Arguments.TranslateSelectedText }>) {
  const language = props.arguments.language || getPreferenceValues<ExtensionPreferences>().translateTo || "English";
  return <SelectedTextCommand task={{ kind: "translate", language }} />;
}
