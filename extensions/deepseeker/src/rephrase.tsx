import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_rephrase;
const model_override = getPreferenceValues().model_rephrase;
const toast_title = "Rephrasing...";

export default function Rephrase() {
  return ResultView(prompt, model_override, toast_title, true);
}
