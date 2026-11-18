import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function AskAI(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.AskAboutSelectedText>();
  return useGemini(props, { context: prompt, allowPaste: true, useSelected: true });
}
