import useGemini from "./api/gemini";
import { getPreferenceValues } from "@raycast/api";

export default function Explain(props) {
  const { prompt } = getPreferenceValues();
  return useGemini(props, { context: prompt, useSelected: true });
}
