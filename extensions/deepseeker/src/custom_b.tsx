import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function CustomActionB() {
  const { prompt_custom_b, model_custom_b } = getPreferenceValues();
  const toastTitle = "Thinking...";
  return ResultView(prompt_custom_b, model_custom_b, toastTitle, true);
}
