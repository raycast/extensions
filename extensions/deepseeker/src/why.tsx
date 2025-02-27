import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_why;
const model_override = getPreferenceValues().model_why;
const toast_title = "Explaining...";

export default function why() {
  return ResultView(prompt, model_override, toast_title, true);
}
