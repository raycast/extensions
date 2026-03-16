import useGemini from "./api/gemini";
import { getPreferenceValues, LaunchProps } from "@raycast/api";

interface CommandPreferences {
  prompt: string;
}

export default function Shorter(props: LaunchProps) {
  const { prompt } = getPreferenceValues<CommandPreferences>();
  return useGemini(props, {
    context: prompt,
    allowPaste: true,
    useSelected: true,
  });
}
