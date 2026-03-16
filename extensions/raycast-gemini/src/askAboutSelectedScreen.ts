import { getPreferenceValues, LaunchProps } from "@raycast/api";
import askScreenshot from "./askScreenshot";

interface CommandPreferences {
  prompt: string;
}

export default async function AskAboutSelectedScreenContent(props: LaunchProps) {
  const { prompt } = getPreferenceValues<CommandPreferences>();
  await askScreenshot(props, prompt, true);
}
