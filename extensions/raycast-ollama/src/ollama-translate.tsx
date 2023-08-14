import ResultView from "./api/main";
import { getPreferenceValues } from "@raycast/api";
import { OllamaApiGenerateRequestBody } from "./api/types";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const body = {
    model: preferences.ollamaTranslateModel,
    prompt: "",
    system: "Act as a translator. Translate the following text.\n\nOutput only with the translated text.\n",
  } as OllamaApiGenerateRequestBody;

  return ResultView(body, true);
}
