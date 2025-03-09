import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_what;
const modelOverride = getPreferenceValues().model_what;
const toastTitle = "Introducing...";

export default function What() {
  return ResultView(prompt, modelOverride, toastTitle, true);
}
