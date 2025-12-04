import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_rewrite;
const model_override = getPreferenceValues().model_rewrite;
const toast_title = "Rewriting...";

export default function Rewrite() {
  return ResultView(prompt, model_override, toast_title);
}
