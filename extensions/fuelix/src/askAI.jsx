import useFuelIX from "./api/useFuelIX";
import { getPreferenceValues } from "@raycast/api";

export default function AskAI(props) {
  const { prompt } = getPreferenceValues();
  if (props?.launchContext?.buffer) {
    return useFuelIX(
      { ...props, arguments: props?.launchContext?.args },
      {
        buffer: props?.launchContext?.buffer,
        context: props?.launchContext?.context,
        useSelected: props?.launchContext?.useSelected,
      },
    );
  } else {
    return useFuelIX(props, { context: prompt });
  }
}
