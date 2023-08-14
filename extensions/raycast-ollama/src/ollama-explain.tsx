import ResultView from "./api/main";
import { getPreferenceValues } from "@raycast/api";
import { OllamaApiGenerateRequestBody } from "./api/types";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const body = {
    model: preferences.ollamaExplainSimpleTerms,
    prompt: "",
    system:
      "Act as a writer. Explain the following text in simple and concise terms.\n\nOutput only with the modified text.\n",
  } as OllamaApiGenerateRequestBody;

  return ResultView(body, true);
}
