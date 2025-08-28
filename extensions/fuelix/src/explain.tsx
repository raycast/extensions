import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues } from "@raycast/api";

export default function Explain() {
  const { prompt } = getPreferenceValues();
  return useFuelIX({ context: prompt, useSelected: true });
}
