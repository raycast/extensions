import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_refine;
const model_override = getPreferenceValues().model_refine;
const provider_sort = getPreferenceValues().provider_sort_refine;
const toast_title = "Rewriting...";

export default function Refine() {
  return ResultView({
    prompt,
    model_override,
    provider_sort,
    toast_title,
  });
}
