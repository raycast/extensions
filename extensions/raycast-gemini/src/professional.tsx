import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Professional(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.Professional>();
  return useGemini(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
