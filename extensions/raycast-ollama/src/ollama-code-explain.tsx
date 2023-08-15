import { ResultView } from "./api/main";
import { getPreferenceValues } from "@raycast/api";
import { OllamaApiGenerateRequestBody } from "./api/types";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const body = {
    model: preferences.ollamaCodeExplain,
    prompt: "",
    system:
      "Act as a developer. Explain the following code block step by step.\n\nOutput only with the commented code.\n",
  } as OllamaApiGenerateRequestBody;

  return ResultView(body, true);
}
