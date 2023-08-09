import { RaycastArgumentsOllamaCommandCustom } from "./api/types";
import { GetCustomPrompt } from "./api/prompt";
import ResultView from "./api/main";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(props: RaycastArgumentsOllamaCommandCustom): JSX.Element {
  const prompt = GetCustomPrompt(preferences.ollamaAskCustomCommandModel, props.arguments.prompt);

  return ResultView(preferences.ollamaAskCustomCommandModel, prompt.prompt, prompt.tagEnd, true);
}
