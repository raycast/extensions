import { OllamaApiGenerateRequestBody, RaycastArgumentsOllamaChatCustom } from "./api/types";
import { ListView } from "./api/main";

export default function Command(props: RaycastArgumentsOllamaChatCustom): JSX.Element {
  const body = {
    model: props.arguments.model,
  } as OllamaApiGenerateRequestBody;

  return ListView(body);
}
