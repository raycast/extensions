import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function FindSynonym(props: LaunchProps) {
  const { prompt } = getPreferenceValues<Preferences.Synonym>();
  return useGemini(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
