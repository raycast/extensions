import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Friendly(props: LaunchProps<{ arguments: Arguments.Friendly }>) {
  const { prompt } = getPreferenceValues();
  return useFuelIX(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
