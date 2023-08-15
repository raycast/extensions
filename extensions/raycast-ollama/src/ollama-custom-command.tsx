import { OllamaApiGenerateRequestBody, RaycastArgumentsOllamaCommandCustom } from "./api/types";
import { ResultView } from "./api/main";

export default function Command(props: RaycastArgumentsOllamaCommandCustom): JSX.Element {
  const body = {
    model: props.arguments.model,
  } as OllamaApiGenerateRequestBody;

  return ResultView(body, true);
}
