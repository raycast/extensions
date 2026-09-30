import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Grammar(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.Grammar>();
  return useGemini(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
