import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues } from "@raycast/api";

export default function Longer() {
  const { prompt } = getPreferenceValues();
  return useFuelIX({
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
