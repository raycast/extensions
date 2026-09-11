import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Comment(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.Comment>();
  return useGemini(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
