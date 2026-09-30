import { getPreferenceValues } from "@raycast/api";
import ResultView from "./ResultView";

const prompt = getPreferenceValues().prompt_custom;
const model_override = getPreferenceValues().model_custom;
const provider_sort = getPreferenceValues().provider_sort_custom;
const toast_title = "Thinking...";

export default function CustomAction() {
  return ResultView({
    prompt,
    model_override,
    provider_sort,
    toast_title,
  });
}
