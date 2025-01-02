import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_refine;
const model_override = getPreferenceValues().model_refine;
const toast_title = "Refining...";

export default function Refine() {
  return ResultView(prompt, model_override, toast_title);
}
