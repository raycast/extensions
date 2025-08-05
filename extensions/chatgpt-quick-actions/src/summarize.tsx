import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_summarize;
const model_override = getPreferenceValues().model_summarize;
const toast_title = "Summarizing...";

export default function Summarize() {
  return ResultView(prompt, model_override, toast_title);
}
