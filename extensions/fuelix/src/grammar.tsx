import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

export default function Grammar(props: LaunchProps<{ arguments: Arguments.Grammar }>) {
  const { prompt } = getPreferenceValues();
  return useFuelIX(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
