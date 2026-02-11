import useGemini from "./api/gemini";
import { getPreferenceValues } from "@raycast/api";

export default function Grammar(props) {
  const { prompt } = getPreferenceValues();
  return useGemini(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
