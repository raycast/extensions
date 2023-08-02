import { RaycastArgumentsOllamaAskCustom } from "./api/types";
import { GetCustomPrompt } from "./api/prompt";
import ResultView from "./api/main";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(props: RaycastArgumentsOllamaAskCustom): JSX.Element {
  const prompt = GetCustomPrompt(preferences.ollamaAskCustomPromptModel, props.arguments.prompt, props.arguments.query);

  return ResultView(preferences.ollamaAskCustomPromptModel, prompt.prompt, prompt.tagEnd, false);
}
