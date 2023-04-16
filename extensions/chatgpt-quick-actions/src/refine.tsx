import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_refine;
const toast_title = "Rewriting...";

export default function Refine() {
  return ResultView(prompt, toast_title);
}
