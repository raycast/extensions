import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Summarize(props: LaunchProps<{ arguments: Arguments.Summarize }>) {
  const { prompt } = getPreferenceValues();
  return useFuelIX(props, { context: prompt, useSelected: true });
}
