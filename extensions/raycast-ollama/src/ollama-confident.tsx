import { ResultView } from "./api/main";
import { getPreferenceValues } from "@raycast/api";
import { OllamaApiGenerateRequestBody } from "./api/types";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const body = {
    model: preferences.ollamaConfidentModel,
    prompt: "",
    system:
      "Act as a writer. Make the following text more confident while keeping the core idea.\n\nOutput only with the modified text.\n",
  } as OllamaApiGenerateRequestBody;

  return ResultView(body, true);
}
