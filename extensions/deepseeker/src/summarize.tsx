import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_summarize;
const modelOverride = getPreferenceValues().model_summarize;
const toastTitle = "Summarizing...";

export default function Summarize() {
  return ResultView(prompt, modelOverride, toastTitle, true);
}
