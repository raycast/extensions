import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Professional(props: LaunchProps<{ arguments: Arguments.Professional }>) {
  const { prompt } = getPreferenceValues();
  return useFuelIX(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
