import ResultView from "./api/main";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command({ fallbackText }: { fallbackText: string }): JSX.Element {
  return ResultView(preferences.ollamaAskModel, fallbackText, "", false);
}
