import { OllamaApiGenerateRequestBody, RaycastArgumentsOllamaAskCustom } from "./api/types";
import ResultView from "./api/main";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(props: RaycastArgumentsOllamaAskCustom): JSX.Element {
  const body = {
    model: preferences.ollamaAskCustomPromptModel,
    prompt: props.arguments.query,
    system: props.arguments.prompt,
  } as OllamaApiGenerateRequestBody;

  return ResultView(body, false);
}
