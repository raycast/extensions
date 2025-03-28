import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_custom;
const modelOverride = getPreferenceValues().model_custom;
const toastTitle = "Thinking...";

export default function CustomAction() {
  return ResultView(prompt, modelOverride, toastTitle, true);
}
