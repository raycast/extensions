import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_rephrase;
const modelOverride = getPreferenceValues().model_rephrase;
const toastTitle = "Rephrasing...";

export default function Rephrase() {
  return ResultView(prompt, modelOverride, toastTitle, true);
}
