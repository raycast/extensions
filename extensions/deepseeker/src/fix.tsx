import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_fix;
const modelOverride = getPreferenceValues().model_fix;
const toastTitle = "Fixing...";

export default function Fix() {
  return ResultView(prompt, modelOverride, toastTitle, true);
}
