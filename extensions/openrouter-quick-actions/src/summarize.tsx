import { getPreferenceValues } from "@raycast/api";
import ResultView from "./ResultView";

const prompt = getPreferenceValues().prompt_summarize;
const model_override = getPreferenceValues().model_summarize;
const provider_sort = getPreferenceValues().provider_sort_summarize;
const toast_title = "Summarizing...";

export default function Summarize() {
  return ResultView({
    prompt,
    model_override,
    provider_sort,
    toast_title,
  });
}
