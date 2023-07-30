import { RaycastArgumentsOllamaAsk } from "./api/types";
import ResultView from "./api/main";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();

export default function Command(props: RaycastArgumentsOllamaAsk): JSX.Element {
  return ResultView(preferences.ollamaAskModel, props.arguments.query, "", false);
}
