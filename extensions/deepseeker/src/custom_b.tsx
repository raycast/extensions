import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const { prompt_custom_b, model_custom_b } = getPreferenceValues();
const toastTitle = "Thinking...";

export default function CustomActionB() {
  return ResultView(prompt_custom_b, model_custom_b, toastTitle, true);
}
