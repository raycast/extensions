import { OllamaApiGenerateRequestBody, RaycastArgumentsOllamaAskCustom } from "./api/types";
import { ResultView } from "./api/main";

export default function Command(props: RaycastArgumentsOllamaAskCustom): JSX.Element {
  const body = {
    model: props.arguments.model,
    prompt: props.arguments.query,
  } as OllamaApiGenerateRequestBody;

  return ResultView(body, false);
}
