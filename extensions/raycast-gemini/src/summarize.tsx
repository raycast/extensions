import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Summarize(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.Summarize>();
  return useGemini(props, { context: prompt, useSelected: true });
}
