import { getPreferenceValues, LaunchProps } from "@raycast/api";
import askScreenshot from "./askScreenshot";

export default async function AskAboutSelectedScreenContent(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.AskAboutSelectedScreen>();
  await askScreenshot(props, prompt, true);
}
