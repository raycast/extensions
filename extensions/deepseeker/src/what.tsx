import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_what;
const model_override = getPreferenceValues().model_what;
const toast_title = "Introducing...";

export default function what() {
  return ResultView(prompt, model_override, toast_title, true);
}
