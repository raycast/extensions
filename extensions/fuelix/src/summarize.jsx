import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues } from "@raycast/api";

export default function Summarize(props) {
  const { prompt } = getPreferenceValues();
  return useFuelIX(props, { context: prompt, useSelected: true });
}
