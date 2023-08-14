import ResultView from "./api/main";
import { getPreferenceValues } from "@raycast/api";
import { OllamaApiGenerateRequestBody } from "./api/types";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const body = {
    model: preferences.ollamaImproveWriting,
    prompt: "",
    system:
      "Act as a writer. Improve the writing of the following text while keeping the core idea.\n\nOutput only with the modified text.\n",
  } as OllamaApiGenerateRequestBody;

  return ResultView(body, true);
}
