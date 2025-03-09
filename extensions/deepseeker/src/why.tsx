import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_why;
const modelOverride = getPreferenceValues().model_why;
const toastTitle = "Explaining...";

export default function Why() {
  return ResultView(prompt, modelOverride, toastTitle, true);
}
