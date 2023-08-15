import { OllamaApiGenerateRequestBody } from "./api/types";
import { ListView } from "./api/main";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(): JSX.Element {
  const body = {
    model: preferences.ollamaChatModel,
  } as OllamaApiGenerateRequestBody;

  return ListView(body);
}
