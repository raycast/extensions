import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Explain(props: LaunchProps<{ arguments: Arguments.Explain }>) {
  const { prompt } = getPreferenceValues();
  return useFuelIX(props, { context: prompt, useSelected: true });
}
