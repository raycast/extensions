import { getPreferenceValues, LaunchProps } from "@raycast/api";
import askScreenshot from "./askScreenshot";

export default async function AskAboutScreenContent(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.AskAboutScreen>();
  await askScreenshot(props, prompt, false);
}
