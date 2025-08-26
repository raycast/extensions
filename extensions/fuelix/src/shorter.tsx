import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Shorter(props: LaunchProps<{ arguments: Arguments.Shorter }>) {
  const { prompt } = getPreferenceValues();
  return useFuelIX(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
