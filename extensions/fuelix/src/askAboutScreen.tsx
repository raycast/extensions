import { getPreferenceValues, LaunchProps } from "@raycast/api";
import askScreenshot from "./askScreenshot";

export default async function AskAboutScreenContent(props: LaunchProps<{ arguments: Arguments.AskAboutScreen }>) {
  const { prompt } = getPreferenceValues();
  await askScreenshot(props, prompt, false);
}
