import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function CustomActionA() {
  const { prompt_custom_a, model_custom_a } = getPreferenceValues();
  const toastTitle = "Thinking...";
  return ResultView(prompt_custom_a, model_custom_a, toastTitle, true);
}
