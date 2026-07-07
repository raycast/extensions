import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Shorter(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.Shorter>();
  return useGemini(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
