import { getPreferenceValues } from "@raycast/api";
import ResultView from "./common";

const prompt = getPreferenceValues().promptSummarize;
const toastTitle = "Summarizing...";

export default function Summarize() {
  return ResultView(prompt, toastTitle);
}
