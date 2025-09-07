import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues } from "@raycast/api";

export default function FindSynonym() {
  const { prompt } = getPreferenceValues();
  return useFuelIX({
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
