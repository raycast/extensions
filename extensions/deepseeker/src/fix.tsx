import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

export default function Fix() {
  const { prompt_fix, model_fix } = getPreferenceValues();
  const toastTitle = "Fixing...";
  return ResultView(prompt_fix, model_fix, toastTitle, true);
}
