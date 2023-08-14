import { OllamaApiGenerateRequestBody, RaycastArgumentsOllamaCommandCustom } from "./api/types";
import ResultView from "./api/main";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(props: RaycastArgumentsOllamaCommandCustom): JSX.Element {
  const body = {
    model: preferences.ollamaAskCustomCommandModel,
    system: props.arguments.prompt,
  } as OllamaApiGenerateRequestBody;

  return ResultView(body, true);
}
