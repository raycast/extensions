import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Friendly(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.Friendly>();
  return useGemini(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
