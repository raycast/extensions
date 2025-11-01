import { getPreferenceValues, LaunchProps } from "@raycast/api";
import askScreenshot from "./askScreenshot";

export default async function AskAboutSelectedScreenContent(
  props: LaunchProps<{ arguments: Arguments.AskAboutSelectedScreen }>,
) {
  const { prompt } = getPreferenceValues();
  await askScreenshot(props, prompt, true);
}
