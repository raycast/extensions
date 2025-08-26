import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Comment(props: LaunchProps<{ arguments: Arguments.Comment }>) {
  const { prompt } = getPreferenceValues();
  return useFuelIX(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
