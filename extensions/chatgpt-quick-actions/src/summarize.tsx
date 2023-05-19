import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().prompt_summarize;
const toast_title = "Summarizing...";

export default function Summarize() {
  return ResultView(prompt, toast_title);
}
