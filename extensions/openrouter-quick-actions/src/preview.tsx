import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = "You are a helpful assistant.";
const model_override = getPreferenceValues().model_preview;
const provider_sort = getPreferenceValues().provider_sort_preview;
const toast_title = "Thinking...";

export default function Preview() {
  return ResultView({
    prompt,
    model_override,
    provider_sort,
    toast_title,
  });
}
