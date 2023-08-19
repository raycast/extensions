import { OllamaApiGenerateRequestBody, RaycastArgumentsOllamaAsk } from "./api/types";
import { ResultView } from "./api/main";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(props: RaycastArgumentsOllamaAsk): JSX.Element {
  const body = {
    model: preferences.ollamaAskModel,
    prompt: props.arguments.query,
  } as OllamaApiGenerateRequestBody;
  return ResultView(body, false);
}
