import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const { prompt_fix, model_fix } = getPreferenceValues();
const toastTitle = "Fixing...";

export default function Fix() {
  return ResultView(prompt_fix, model_fix, toastTitle, true);
}
