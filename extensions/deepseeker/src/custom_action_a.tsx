import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const { prompt_custom_a, model_custom_a } = getPreferenceValues();
const toastTitle = "Thinking...";

export default function CustomActionA() {
  return ResultView(prompt_custom_a, model_custom_a, toastTitle, true);
}
