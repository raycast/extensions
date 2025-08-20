import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues } from "@raycast/api";

export default function AskAI(props) {
  const { prompt } = getPreferenceValues();
  return useFuelIX(props, { context: prompt, allowPaste: true, useSelected: true });
}
