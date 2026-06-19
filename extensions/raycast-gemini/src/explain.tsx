import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Explain(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.Explain>();
  return useGemini(props, { context: prompt, useSelected: true });
}
