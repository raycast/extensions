import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_fix;
const model_override = getPreferenceValues().model_fix;
const toast_title = "Fixing...";

export default function fix() {
  return ResultView(prompt, model_override, toast_title, true);
}
