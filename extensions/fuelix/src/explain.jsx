import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues } from "@raycast/api";

export default function Explain(props) {
  const { prompt } = getPreferenceValues();
  return useFuelIX(props, { context: prompt, useSelected: true });
}
