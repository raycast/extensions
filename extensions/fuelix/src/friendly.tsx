import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues } from "@raycast/api";

export default function Friendly() {
  const { prompt } = getPreferenceValues();
  return useFuelIX({
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
