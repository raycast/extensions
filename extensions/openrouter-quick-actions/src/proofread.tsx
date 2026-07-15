import { getPreferenceValues } from "@raycast/api";
import ResultView from "./ResultView";

const prompt = getPreferenceValues().prompt_proofread;
const model_override = getPreferenceValues().model_proofread;
const provider_sort = getPreferenceValues().provider_sort_proofread;
const toast_title = "Proofreading...";

export default function Proofread() {
  return ResultView({
    prompt,
    model_override,
    provider_sort,
    toast_title,
  });
}
