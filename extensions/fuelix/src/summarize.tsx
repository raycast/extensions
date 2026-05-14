import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues } from "@raycast/api";

export default function Summarize() {
  const { prompt } = getPreferenceValues();
  return useFuelIX({ context: prompt, useSelected: true });
}
