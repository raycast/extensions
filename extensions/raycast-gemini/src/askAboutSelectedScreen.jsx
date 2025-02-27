import { getPreferenceValues } from "@raycast/api";
import askScreenshot from "./askScreenshot";

export default async function AskAboutSelectedScreenContent(props) {
  const { prompt } = getPreferenceValues();
  await askScreenshot(props, prompt, true);
}
